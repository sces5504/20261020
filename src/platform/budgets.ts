// Full snapshot includes versioned character art, complete world media and resource art.
// Keep compressed and expanded limits independent to bound portable import memory.
// 2026-10-25: 72 characters + chapter media reached 68.7 MiB of already-compressed images.
export const ARCHIVE_BYTES = 96 * 1024 * 1024;
export const EXPANDED_BYTES = 192 * 1024 * 1024;
export const ENTRY_BYTES = 30 * 1024 * 1024;
