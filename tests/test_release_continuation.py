import importlib.util
from pathlib import Path
import unittest
spec=importlib.util.spec_from_file_location('continuation',Path(__file__).resolve().parents[1]/'scripts/continue-release.py')
m=importlib.util.module_from_spec(spec);spec.loader.exec_module(m)
class Continuation(unittest.TestCase):
 def setUp(self):
  self.commands=[['npm','run','content:check'],['npm','run','build'],['npm','run','test:exploration']]
  self.report={'mode':'release','dirty':False,'head':'a'*40,'results':[{'argv':v,'exit_code':0 if i<2 else 1} for i,v in enumerate(self.commands)]}
 def test_only_successful_unaffected_commands_are_reused(self):
  result=m.reusable_results(self.report,self.commands,['public/catalog/characters.json'])
  self.assertEqual(list(result),[tuple(self.commands[0])]);self.assertNotIn(tuple(self.commands[1]),result);self.assertNotIn(tuple(self.commands[2]),result)
 def test_runtime_or_gate_changes_reject_reuse(self):
  for path in ['src/domain/combat.ts','content/core/pack.json','.template/project.json','tools/game/e2e.mjs']:
   with self.assertRaises(ValueError):m.reusable_results(self.report,self.commands,[path])
 def test_dirty_wrong_order_and_missing_identity_reject(self):
  for key,value in [('dirty',True),('head','invalid'),('mode','daily')]:
   bad={**self.report,key:value}
   with self.assertRaises(ValueError):m.reusable_results(bad,self.commands,['public/catalog/characters.json'])
  with self.assertRaises(ValueError):m.reusable_results(self.report,list(reversed(self.commands)),['public/catalog/characters.json'])
if __name__=='__main__':unittest.main()
