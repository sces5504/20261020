import importlib.util
import json
from pathlib import Path
import sys
import subprocess
import tempfile
import unittest

spec = importlib.util.spec_from_file_location('project', Path(__file__).resolve().parents[1] / 'scripts/project.py')
project = importlib.util.module_from_spec(spec)
spec.loader.exec_module(project)


class DeploymentSafety(unittest.TestCase):
    def setUp(self):
        self.temp = tempfile.TemporaryDirectory()
        self.addCleanup(self.temp.cleanup)
        self.root = Path(self.temp.name)
        (self.root / '.template').mkdir()
        self.data = {'schema_version': 1, 'initialized': True, 'name': 'fixture', 'site_dir': 'dist',
                     'install': [], 'start': [], 'build': [],
                     'checks': {'daily': [[sys.executable, '-c', 'pass']],
                                'release': [[sys.executable, '-c', 'pass']]}}
        self.write_config()
        (self.root / 'dist').mkdir()
        (self.root / 'dist/index.html').write_text('<h1>public fixture</h1>')

    def write_config(self):
        (self.root / '.template/project.json').write_text(json.dumps(self.data))

    def test_uninitialized_release_is_rejected(self):
        self.data['initialized'] = False
        with self.assertRaisesRegex(ValueError, 'UNINITIALIZED'):
            project.run_checks(self.root, self.data, 'release')

    def test_failed_check_stops_release(self):
        self.data['checks']['daily'] = [[sys.executable, '-c', 'raise SystemExit(7)']]
        with self.assertRaises(subprocess.CalledProcessError):
            project.run_checks(self.root, self.data, 'release')
        report = json.loads((self.root / '.artifacts/checks-release.json').read_text())
        self.assertFalse(report['passed'])
        self.assertEqual(len(report['results']), 1)
        self.assertEqual(report['results'][0]['exit_code'], 7)

    def test_pass_reports_all_daily_and_release_checks(self):
        project.run_checks(self.root, self.data, 'release')
        report = json.loads((self.root / '.artifacts/checks-release.json').read_text())
        self.assertTrue(report['passed'])
        self.assertEqual(len(report['results']), 2)

    def test_only_public_artifact_is_copied(self):
        (self.root / 'docs').mkdir()
        (self.root / 'docs/preferences.md').write_text('not website content')
        output = project.stage(self.root)
        self.assertTrue((output / 'index.html').is_file())
        self.assertFalse((output / 'docs').exists())

    def test_reject_repo_root_outside_and_docs(self):
        for directory in ['.', '../outside', str(self.root.resolve()), 'docs']:
            self.data['site_dir'] = directory
            self.write_config()
            with self.assertRaises(ValueError):
                project.stage(self.root)

    def test_reject_hidden_secret_and_symlink(self):
        for name, content in [('.env', 'secret'), ('private.pem', 'secret'),
                              ('secret.js', 'ghp_' + 'A' * 36)]:
            path = self.root / 'dist' / name
            path.write_text(content)
            with self.assertRaises(ValueError):
                project.stage(self.root)
            path.unlink()
        (self.root / 'dist/leak').symlink_to(self.root / '.template/project.json')
        with self.assertRaises(ValueError):
            project.stage(self.root)

    def test_missing_release_checks_is_not_success(self):
        self.data['checks']['release'] = []
        with self.assertRaises(ValueError):
            project.run_checks(self.root, self.data, 'release')

    def test_reject_symlink_ancestor(self):
        (self.root / 'alias').symlink_to(self.root, target_is_directory=True)
        self.data['site_dir'] = 'alias/dist'
        self.write_config()
        with self.assertRaises(ValueError):
            project.stage(self.root)

    def test_secret_split_across_large_file_chunks_is_rejected(self):
        (self.root / 'dist/asset.js').write_bytes(b'x' * (262144 - 10) + b'ghp_' + b'A' * 36)
        with self.assertRaises(ValueError):
            project.stage(self.root)

    def test_shell_strings_are_not_accepted(self):
        self.data['build'] = ['echo success && dangerous']
        self.write_config()
        with self.assertRaises(ValueError):
            project.config(self.root)


if __name__ == '__main__':
    unittest.main()

