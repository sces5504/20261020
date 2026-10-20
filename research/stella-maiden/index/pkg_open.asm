005cb72c: stp      x28, x27, [sp, #-0x60]!
005cb730: stp      x26, x25, [sp, #0x10]
005cb734: stp      x24, x23, [sp, #0x20]
005cb738: stp      x22, x21, [sp, #0x30]
005cb73c: stp      x20, x19, [sp, #0x40]
005cb740: stp      x29, x30, [sp, #0x50]
005cb744: sub      sp, sp, #0x430
005cb748: mrs      x29, tpidr_el0
005cb74c: ldr      x8, [x29, #0x28]
005cb750: mov      w22, w4
005cb754: mov      w23, w2
005cb758: mov      x21, x1
005cb75c: mov      x19, x0
005cb760: str      x8, [sp, #0x428]
005cb764: str      w3, [x0, #0x88]
005cb768: cbz      w4, #0x5cb7a4
005cb76c: mov      w1, #0x2e
005cb770: mov      x0, x21
005cb774: bl       #0xa06d0
005cb778: mov      x20, x0
005cb77c: cbz      x0, #0x5cb7c4
005cb780: add      x0, sp, #0x220
005cb784: mov      w2, #0x104
005cb788: mov      w1, wzr
005cb78c: bl       #0xa0500
005cb790: sub      x2, x20, x21
005cb794: add      x0, sp, #0x220
005cb798: mov      x1, x21
005cb79c: bl       #0x9ed30
005cb7a0: b        #0x5cb7dc
005cb7a4: mov      x0, x21
005cb7a8: add      x24, x19, #0x1d8
005cb7ac: bl       #0xa1b50
005cb7b0: mov      x2, x0
005cb7b4: mov      x0, x24
005cb7b8: mov      x1, x21
005cb7bc: bl       #0xb6d10
005cb7c0: b        #0x5cb83c
005cb7c4: adrp     x2, #0x764000
005cb7c8: add      x2, x2, #0xea1
005cb7cc: add      x0, sp, #0x220
005cb7d0: mov      w1, #0x104
005cb7d4: mov      x3, x21
005cb7d8: bl       #0xa0d00
005cb7dc: add      x0, sp, #0x220
005cb7e0: add      x21, sp, #0x220
005cb7e4: bl       #0xa1b50
005cb7e8: mov      x8, x0
005cb7ec: cmp      x0, #4
005cb7f0: mov      w0, wzr
005cb7f4: b.lo     #0x5cc890
005cb7f8: adrp     x2, #0x7b9000
005cb7fc: add      x8, x21, x8
005cb800: add      x2, x2, #0xbe7
005cb804: add      x0, sp, #0x324
005cb808: mov      w1, #0x104
005cb80c: add      x3, sp, #0x220
005cb810: mov      w4, wzr
005cb814: mov      x5, x20
005cb818: sturh    wzr, [x8, #-2]
005cb81c: bl       #0xa0d00
005cb820: add      x0, sp, #0x324
005cb824: add      x24, x19, #0x1d8
005cb828: bl       #0xa1b50
005cb82c: mov      x2, x0
005cb830: add      x1, sp, #0x324
005cb834: mov      x0, x24
005cb838: bl       #0xb6d10
005cb83c: mov      w0, #0x90
005cb840: bl       #0x9f120
005cb844: adrp     x25, #0x8d8000
005cb848: add      x25, x25, #0x810
005cb84c: add      x9, x25, #0x10
005cb850: mov      x28, x0
005cb854: mov      x8, #-1
005cb858: stp      x9, xzr, [x0]
005cb85c: mov      x9, x0
005cb860: stp      xzr, xzr, [x0, #0x70]
005cb864: stp      xzr, xzr, [x0, #0x60]
005cb868: str      xzr, [x0, #0x58]
005cb86c: str      xzr, [x28, #0x50]!
005cb870: stp      xzr, xzr, [x0, #0x18]
005cb874: str      xzr, [x0, #0x10]
005cb878: stp      xzr, x8, [x0, #0x28]
005cbf00: ldr      x9, [x21, #0x18]
005cbf04: lsr      w10, w8, #1
005cbf08: tst      w8, #1
005cbf0c: csel     x8, x10, x9, eq
005cbf10: cbz      x8, #0x5cbf64
005cbf14: ldr      x21, [x21]
005cbf18: cbnz     x21, #0x5cbed8
005cbf1c: b        #0x5cc394
005cbf20: ldr      x28, [sp, #0x38]
005cbf24: ldr      x29, [sp, #0x20]
005cbf28: ldr      x8, [x21, #8]
005cbf2c: cmp      x8, x14
005cbf30: b.eq     #0x5cbf40
005cbf34: and      x8, x8, x25
005cbf38: cmp      x8, x26
005cbf3c: b.ne     #0x5cc390
005cbf40: ldrb     w8, [x21, #0x10]
005cbf44: ldr      x9, [x21, #0x18]
005cbf48: lsr      w10, w8, #1
005cbf4c: tst      w8, #1
005cbf50: csel     x8, x10, x9, eq
005cbf54: cbz      x8, #0x5cbf64
005cbf58: ldr      x21, [x21]
005cbf5c: cbnz     x21, #0x5cbf28
005cbf60: b        #0x5cc390
005cbf64: mov      w21, #1
005cbf68: ldrb     w8, [sp, #0x88]
005cbf6c: tbnz     w8, #0, #0x5cc704
005cbf70: b        #0x5cc70c
005cbf74: mov      x8, xzr
005cbf78: stp      xzr, xzr, [sp, #0xd0]
005cbf7c: str      xzr, [sp, #0xe0]
005cbf80: ldrb     w9, [x22, x8]
005cbf84: add      x24, x8, #1
005cbf88: cmp      x24, #0x103
005cbf8c: strb     w9, [x23, x8]
005cbf90: b.hi     #0x5cbfa0
005cbf94: ldrb     w9, [x22, x8]
005cbf98: mov      x8, x24
005cbf9c: cbnz     w9, #0x5cbf80
005cbfa0: add      x0, sp, #0x11c
005cbfa4: bl       #0xa1b50
005cbfa8: mov      x26, x0
005cbfac: subs     x8, x0, #0x16
005cbfb0: b.ls     #0x5cc008
005cbfb4: cmn      x8, #0x27
005cbfb8: b.hs     #0x5cc914
005cbfbc: cmp      x26, #0x2c
005cbfc0: mov      w8, #0x2c
005cbfc4: csel     x8, x26, x8, hi
005cbfc8: add      x9, x8, #0x10
005cbfcc: and      x9, x9, #0xfffffffffffffff0
005cbfd0: cmp      x8, #0x17
005cbfd4: mov      w8, #0x17
005cbfd8: csel     x21, x8, x9, lo
005cbfdc: mov      x0, x21
005cbfe0: bl       #0x9f120
005cbfe4: add      x1, sp, #0x11c
005cbfe8: mov      x2, x26
005cbfec: mov      x27, x0
005cbff0: bl       #0xa16a0
005cbff4: orr      x8, x21, #1
005cbff8: stp      x26, x27, [sp, #0xd8]
005cbffc: str      x8, [sp, #0xd0]
005cc000: strb     wzr, [x27, x26]
005cc004: b        #0x5cc030
005cc008: cbz      x26, #0x5cc01c
005cc00c: add      x1, sp, #0x11c
005cc010: mov      x0, x28
005cc014: mov      x2, x26
005cc018: bl       #0xa16a0
005cc01c: add      x8, sp, #0xd0
005cc020: add      x9, x8, x26
005cc024: lsl      w8, w26, #1
005cc028: strb     wzr, [x9, #1]
005cc02c: strb     w8, [sp, #0xd0]
005cc030: add      x22, x22, w24, uxtw
005cc034: ldr      w9, [x22]
005cc038: add      x10, sp, #5
005cc03c: tst      w8, #1
005cc040: adrp     x1, #0x7b9000
005cc044: str      w9, [sp, #0xe8]
005cc048: ldr      w9, [x22, #4]
005cc04c: add      x1, x1, #0xafe
005cc050: str      w9, [sp, #0xec]
005cc054: ldr      w9, [x22, #8]
005cc058: str      w9, [sp, #0xf0]
005cc05c: ldr      w9, [x22, #0xc]
005cc060: str      w9, [sp, #0x100]
005cc064: ldr      x9, [x22, #0x10]
005cc068: stur     x9, [x10, #0xff]
005cc06c: ldr      w9, [x22, #0x18]
005cc070: str      w9, [sp, #0x10c]
005cc074: ldr      w9, [x22, #0x1c]
005cc078: str      w9, [sp, #0x110]
005cc07c: ldr      w9, [x22, #0x20]
005cc080: str      xzr, [sp, #0xf8]
005cc084: str      w9, [sp, #0x114]
005cc088: ldr      x9, [sp, #0xe0]
005cc08c: csel     x26, x28, x9, eq
005cc090: mov      x0, x26
005cc094: bl       #0xa0030
005cc098: cbz      w0, #0x5cc140
005cc09c: mov      x0, x26
005cc0a0: bl       #0xa1b50
005cc0a4: mov      x21, x0
005cc0a8: add      x0, sp, #0x11c
005cc0ac: mov      w2, #0x104
005cc0b0: mov      w1, wzr
005cc0b4: bl       #0xa0500
005cc0b8: cmp      w21, #1
005cc0bc: b.lt     #0x5cc104
005cc0c0: mov      x24, xzr
005cc0c4: sxtw     x25, w21
005cc0c8: ldrsb    w21, [x26, x24]
005cc0cc: tbnz     w21, #0x1f, #0x5cc0ec
005cc0d0: and      w27, w21, #0xff
005cc0d4: mov      w0, w27
005cc0d8: bl       #0xa0df0
005cc0dc: cbz      w0, #0x5cc0ec
005cc0e0: mov      w0, w27
005cc0e4: bl       #0xa0d50
005cc0e8: mov      w21, w0
005cc0ec: strb     w21, [x23, x24]
005cc0f0: add      x24, x24, #1
005cc0f4: cmp      x24, #0x103
005cc0f8: b.hi     #0x5cc104
005cc0fc: cmp      x24, x25
005cc100: b.lt     #0x5cc0c8
005cc104: add      x0, sp, #0x11c
005cc108: stp      xzr, xzr, [sp, #0x70]
005cc10c: str      xzr, [sp, #0x80]
005cc110: bl       #0xa1b50
005cc114: mov      x26, x0
005cc118: cmn      x0, #0x10
005cc11c: b.hs     #0x5cc914
005cc120: ldr      x25, [sp, #0x50]
005cc124: cmp      x26, #0x17
005cc128: b.hs     #0x5cc170
005cc12c: ldr      x27, [sp, #0x48]
005cc130: lsl      w8, w26, #1
005cc134: strb     w8, [sp, #0x70]
005cc138: cbnz     x26, #0x5cc190
005cc13c: b        #0x5cc1a0
005cc140: ldp      x24, x8, [x19, #0x60]
005cc144: cmp      x24, x8
005cc148: b.eq     #0x5cc3f8
005cc14c: stp      xzr, xzr, [x24, #8]
005cc150: str      xzr, [x24]
005cc154: ldrb     w8, [sp, #0xd0]
005cc158: tbnz     w8, #0, #0x5cc528
005cc15c: ldr      x8, [sp, #0xe0]
005cc160: str      x8, [x24, #0x10]
005cc164: ldr      q0, [sp, #0xd0]
005cc168: str      q0, [x24]
005cc16c: b        #0x5cc5e4
005cc170: add      x8, x26, #0x10
005cc174: and      x21, x8, #0xfffffffffffffff0
005cc178: mov      x0, x21
005cc17c: bl       #0x9f120
005cc180: orr      x8, x21, #1
005cc184: mov      x27, x0
005cc188: stp      x26, x0, [sp, #0x78]
005cc18c: str      x8, [sp, #0x70]
005cc190: add      x1, sp, #0x11c
005cc194: mov      x0, x27
005cc198: mov      x2, x26
005cc19c: bl       #0xa16a0
005cc1a0: ldrb     w8, [sp, #0xd0]
005cc1a4: strb     wzr, [x27, x26]
005cc1a8: stp      xzr, xzr, [x25, #8]
005cc1ac: str      xzr, [x25]
005cc1b0: tbnz     w8, #0, #0x5cc1c8
005cc1b4: ldr      x8, [sp, #0xe0]
005cc1b8: ldr      q0, [sp, #0xd0]
005cc1bc: str      x8, [x25, #0x10]
005cc1c0: str      q0, [x25]
005cc1c4: b        #0x5cc22c
005cc1c8: ldr      x26, [sp, #0xd8]
005cc1cc: cmn      x26, #0x10
005cc1d0: b.hs     #0x5cc914
005cc1d4: ldr      x27, [sp, #0xe0]
005cc1d8: cmp      x26, #0x17
005cc1dc: b.hs     #0x5cc1f4
005cc1e0: ldr      x21, [sp, #0x28]
005cc1e4: lsl      w8, w26, #1
005cc1e8: strb     w8, [sp, #0x88]
005cc1ec: cbnz     x26, #0x5cc218
005cc1f0: b        #0x5cc228
005cc1f4: add      x8, x26, #0x10
005cc1f8: and      x28, x8, #0xfffffffffffffff0
005cc1fc: mov      x0, x28
005cc200: bl       #0x9f120
005cc204: orr      x8, x28, #1
005cc208: ldr      x28, [sp, #0x38]
005cc20c: mov      x21, x0
005cc210: stp      x26, x0, [sp, #0x90]
005cc214: str      x8, [sp, #0x88]
005cc218: mov      x0, x21
005cc21c: mov      x1, x27
005cc220: mov      x2, x26
005cc224: bl       #0xa16a0
005cc228: strb     wzr, [x21, x26]
005cc22c: ldr      x8, [sp, #0x40]
005cc230: add      x0, sp, #0x118
005cc234: ldp      q0, q1, [x8, #0x10]
005cc238: ldr      q2, [x8]
005cc23c: ldr      x8, [sp, #0x58]
005cc240: stp      q0, q1, [x8, #0x10]
005cc244: str      q2, [x8]
005cc248: ldrb     w8, [sp, #0x70]
005cc24c: ldp      x10, x9, [sp, #0x78]
005cc250: lsr      w11, w8, #1
005cc254: tst      w8, #1
005cc258: ldr      x8, [sp, #0x48]
005cc25c: csel     x2, x11, x10, eq
005cc260: csel     x1, x8, x9, eq
005cc264: bl       #0x3ecba0
005cc268: ldr      x24, [x19, #0x18]
005cc26c: mov      x14, x0
005cc270: cbz      x24, #0x5cc394
005cc274: sub      x25, x24, #1
005cc278: ands     x8, x25, x24
005cc27c: b.eq     #0x5cc37c
005cc280: cmp      x14, x24
005cc284: mov      x26, x14
005cc288: b.lo     #0x5cc294
005cc28c: udiv     x9, x14, x24
005cc290: msub     x26, x9, x24, x14
005cc294: ldr      x9, [sp, #0x68]
005cc298: ldr      x9, [x9]
005cc29c: ldr      x9, [x9, x26, lsl #3]
005cc2a0: cbz      x9, #0x5cc390
005cc2a4: ldr      x21, [x9]
005cc2a8: cbz      x21, #0x5cc390
005cc2ac: ldrb     w9, [sp, #0x70]
005cc2b0: ldp      x10, x11, [sp, #0x78]
005cc2b4: lsr      w12, w9, #1
005cc2b8: tst      w9, #1
005cc2bc: ldr      x9, [sp, #0x48]
005cc2c0: csel     x27, x12, x10, eq
005cc2c4: csel     x29, x9, x11, eq
005cc2c8: cbz      x8, #0x5cc61c
005cc2cc: cbz      x27, #0x5cbecc
005cc2d0: ldr      x25, [sp, #0x50]
005cc2d4: ldr      x8, [x21, #8]
005cc2d8: cmp      x8, x14
005cc2dc: b.eq     #0x5cc2f8
005cc2e0: cmp      x8, x24
005cc2e4: b.lo     #0x5cc2f0
005cc2e8: udiv     x9, x8, x24
005cc2ec: msub     x8, x9, x24, x8
005cc2f0: cmp      x8, x26
005cc2f4: b.ne     #0x5cc370
005cc2f8: mov      x8, x21
005cc2fc: ldrb     w10, [x8, #0x10]!
005cc300: ldr      x11, [x8, #8]
005cc304: lsr      w9, w10, #1
005cc308: tst      w10, #1
005cc30c: csel     x11, x9, x11, eq
005cc310: cmp      x11, x27
005cc314: b.ne     #0x5cc368
005cc318: tbnz     w10, #0, #0x5cc34c
005cc31c: add      x8, x8, #1
005cc320: neg      x9, x9
005cc324: mov      x10, x29
005cc328: ldrb     w11, [x8]
005cc32c: ldrb     w12, [x10]
005cc330: cmp      w11, w12
005cc334: b.ne     #0x5cc368
005cc338: add      x8, x8, #1
005cc33c: adds     x9, x9, #1
005cc340: add      x10, x10, #1
005cc344: b.ne     #0x5cc328
005cc348: b        #0x5cc6c0
005cc34c: ldr      x0, [x21, #0x20]
005cc350: mov      x1, x29
005cc354: mov      x2, x27
005cc358: mov      x28, x14
005cc35c: bl       #0x9f080
005cc360: mov      x14, x28
005cc364: cbz      w0, #0x5cc6c0
005cc368: ldr      x21, [x21]
005cc36c: cbnz     x21, #0x5cc2d4
005cc370: ldr      x28, [sp, #0x38]
005cc374: ldr      x29, [sp, #0x20]
005cc378: b        #0x5cc394
005cc37c: and      x26, x25, x14
005cc380: ldr      x9, [sp, #0x68]
005cc384: ldr      x9, [x9]
005cc388: ldr      x9, [x9, x26, lsl #3]
005cc38c: cbnz     x9, #0x5cc2a4
005cc390: ldr      x25, [sp, #0x50]
005cc394: mov      w0, #0x70
005cc398: str      x14, [sp, #0x60]
005cc39c: bl       #0x9f120
005cc3a0: ldrb     w9, [sp, #0x70]
005cc3a4: mov      x8, x0
005cc3a8: mov      x27, x0
005cc3ac: str      xzr, [x8, #0x10]!
005cc3b0: stp      xzr, xzr, [x0, #0x18]
005cc3b4: tbnz     w9, #0, #0x5cc3cc
005cc3b8: ldr      x9, [sp, #0x80]
005cc3bc: ldr      q0, [sp, #0x70]
005cc3c0: str      x9, [x8, #0x10]
005cc3c4: str      q0, [x8]
005cc3c8: b        #0x5cc454
005cc3cc: ldr      x28, [sp, #0x78]
005cc3d0: cmn      x28, #0x10
005cc3d4: b.hs     #0x5cc914
005cc3d8: ldr      x1, [sp, #0x80]
005cc3dc: cmp      x28, #0x17
005cc3e0: b.hs     #0x5cc414
005cc3e4: lsl      w8, w28, #1
005cc3e8: add      x21, x27, #0x11
005cc3ec: strb     w8, [x27, #0x10]
005cc3f0: cbnz     x28, #0x5cc440
005cc3f4: b        #0x5cc44c
005cc3f8: ldr      x0, [sp, #0x18]
005cc3fc: add      x1, sp, #0xd0
005cc400: bl       #0x5d0374
005cc404: ldrb     w8, [sp, #0xd0]
005cc408: add      x22, x22, #0x24
005cc40c: tbnz     w8, #0, #0x5cc758
005cc410: b        #0x5cc78c
005cc414: add      x8, x28, #0x10
005cc418: and      x25, x8, #0xfffffffffffffff0
005cc41c: mov      x0, x25
005cc420: mov      x21, x1
005cc424: bl       #0x9f120
005cc428: orr      x8, x25, #1
005cc42c: ldr      x25, [sp, #0x50]
005cc430: mov      x1, x21
005cc434: mov      x21, x0
005cc438: stp      x28, x0, [x27, #0x18]
005cc43c: str      x8, [x27, #0x10]
005cc440: mov      x0, x21
005cc444: mov      x2, x28
005cc448: bl       #0xa16a0
005cc44c: strb     wzr, [x21, x28]
005cc450: ldr      x28, [sp, #0x38]
005cc454: ldr      x8, [x25, #0x10]
005cc458: ldr      x9, [sp, #0x58]
005cc45c: ldr      q0, [x25]
005cc460: stp      xzr, xzr, [x25, #8]
005cc464: str      xzr, [x25]
005cc468: ldp      q1, q2, [x9]
005cc46c: ldr      q3, [x9, #0x20]
005cc470: str      x8, [x27, #0x38]
005cc474: ldr      x8, [sp, #0x60]
005cc478: stur     q0, [x27, #0x28]
005cc47c: stp      q2, q3, [x27, #0x50]
005cc480: str      q1, [x27, #0x40]
005cc484: stp      xzr, x8, [x27]
005cc488: ldr      x8, [x19, #0x28]
005cc48c: ldr      s0, [x19, #0x30]
005cc490: add      x8, x8, #1
005cc494: ucvtf    s1, x8
005cc498: cbz      x24, #0x5cc4ac
005cc49c: ucvtf    s2, x24
005cc4a0: fmul     s2, s0, s2
005cc4a4: fcmp     s2, s1
005cc4a8: b.pl     #0x5cc50c
005cc4ac: cmp      x24, #3
005cc4b0: lsl      x8, x24, #1
005cc4b4: b.lo     #0x5cc4c8
005cc4b8: sub      x9, x24, #1
005cc4bc: tst      x9, x24
005cc4c0: cset     w9, ne
005cc4c4: b        #0x5cc4cc
005cc4c8: mov      w9, #1
005cc4cc: fdiv     s0, s1, s0
005cc4d0: ldr      x0, [sp, #0x68]
005cc4d4: orr      x8, x9, x8
005cc4d8: fcvtpu   x9, s0
005cc4dc: cmp      x8, x9
005cc4e0: csel     x1, x9, x8, lo
005cc4e4: bl       #0x5cffd8
005cc4e8: ldr      x24, [x19, #0x18]
005cc4ec: sub      x8, x24, #1
005cc4f0: tst      x8, x24
005cc4f4: b.eq     #0x5cc554
005cc4f8: ldr      x26, [sp, #0x60]
005cc4fc: cmp      x26, x24
005cc500: b.lo     #0x5cc50c
005cc504: udiv     x8, x26, x24
005cc508: msub     x26, x8, x24, x26
005cc50c: ldr      x8, [sp, #0x68]
005cc510: ldr      x9, [x8]
005cc514: ldr      x8, [x9, x26, lsl #3]
005cc518: cbz      x8, #0x5cc56c
005cc51c: ldr      x9, [x8]
005cc520: str      x9, [x27]
005cc524: b        #0x5cc6e8
005cc528: ldr      x26, [sp, #0xd8]
005cc52c: cmn      x26, #0x10
005cc530: b.hs     #0x5cc914
005cc534: ldr      x27, [sp, #0xe0]
005cc538: cmp      x26, #0x17
005cc53c: b.hs     #0x5cc5ac
005cc540: lsl      w8, w26, #1
005cc544: mov      x28, x24
005cc548: strb     w8, [x28], #1
005cc54c: cbnz     x26, #0x5cc5cc
005cc550: b        #0x5cc5dc
005cc554: ldr      x9, [sp, #0x60]
005cc558: and      x26, x8, x9
005cc55c: ldr      x8, [sp, #0x68]
005cc560: ldr      x9, [x8]
005cc564: ldr      x8, [x9, x26, lsl #3]
005cc568: cbnz     x8, #0x5cc51c
005cc56c: ldr      x10, [sp, #0x30]
005cc570: ldr      x8, [x10]
005cc574: str      x8, [x27]
005cc578: str      x27, [x10]
005cc57c: str      x10, [x9, x26, lsl #3]
005cc580: ldr      x8, [x27]
005cc584: cbz      x8, #0x5cc6ec
005cc588: ldr      x8, [x8, #8]
005cc58c: sub      x9, x24, #1
005cc590: tst      x9, x24
005cc594: b.eq     #0x5cc6d8
005cc598: cmp      x8, x24
005cc59c: b.lo     #0x5cc6dc
005cc5a0: udiv     x9, x8, x24
005cc5a4: msub     x8, x9, x24, x8
005cc5a8: b        #0x5cc6dc
005cc5ac: add      x8, x26, #0x10
005cc5b0: and      x21, x8, #0xfffffffffffffff0
005cc5b4: mov      x0, x21
005cc5b8: bl       #0x9f120
005cc5bc: orr      x8, x21, #1
005cc5c0: mov      x28, x0
005cc5c4: stp      x26, x0, [x24, #8]
005cc5c8: str      x8, [x24]
005cc5cc: mov      x0, x28
005cc5d0: mov      x1, x27
005cc5d4: mov      x2, x26
005cc5d8: bl       #0xa16a0
005cc5dc: strb     wzr, [x28, x26]
005cc5e0: ldr      x28, [sp, #0x38]
005cc5e4: ldr      x8, [sp, #0x40]
005cc5e8: ldr      q0, [x8, #0x20]
005cc5ec: stur     q0, [x24, #0x38]
005cc5f0: ldr      q0, [x8, #0x10]
005cc5f4: stur     q0, [x24, #0x28]
005cc5f8: ldr      q0, [x8]
005cc5fc: stur     q0, [x24, #0x18]
005cc600: ldr      x8, [x19, #0x60]
005cc604: add      x8, x8, #0x48
005cc608: str      x8, [x19, #0x60]
005cc60c: ldrb     w8, [sp, #0xd0]
005cc610: add      x22, x22, #0x24
005cc614: tbnz     w8, #0, #0x5cc758
005cc618: b        #0x5cc78c
005cc61c: cbz      x27, #0x5cbf20
005cc620: ldr      x8, [x21, #8]
005cc624: cmp      x8, x14
005cc628: b.eq     #0x5cc638
005cc62c: and      x8, x8, x25
005cc630: cmp      x8, x26
005cc634: b.ne     #0x5cc6b0
005cc638: mov      x8, x21
005cc63c: ldrb     w10, [x8, #0x10]!
005cc640: ldr      x11, [x8, #8]
005cc644: lsr      w9, w10, #1
005cc648: tst      w10, #1
005cc64c: csel     x11, x9, x11, eq
005cc650: cmp      x11, x27
005cc654: b.ne     #0x5cc6a8
005cc658: tbnz     w10, #0, #0x5cc68c
005cc65c: add      x8, x8, #1
005cc660: neg      x9, x9
005cc664: mov      x10, x29
005cc668: ldrb     w11, [x8]
005cc66c: ldrb     w12, [x10]
005cc670: cmp      w11, w12
005cc674: b.ne     #0x5cc6a8
005cc678: add      x8, x8, #1
005cc67c: adds     x9, x9, #1
005cc680: add      x10, x10, #1
005cc684: b.ne     #0x5cc668
005cc688: b        #0x5cc6c0
005cc68c: ldr      x0, [x21, #0x20]
005cc690: mov      x1, x29
005cc694: mov      x2, x27
005cc698: mov      x28, x14
005cc69c: bl       #0x9f080
005cc6a0: mov      x14, x28
005cc6a4: cbz      w0, #0x5cc6c0
005cc6a8: ldr      x21, [x21]
005cc6ac: cbnz     x21, #0x5cc620
005cc6b0: ldr      x28, [sp, #0x38]
005cc6b4: ldr      x25, [sp, #0x50]
005cc6b8: ldr      x29, [sp, #0x20]
005cc6bc: b        #0x5cc394
005cc6c0: ldr      x28, [sp, #0x38]
005cc6c4: ldr      x29, [sp, #0x20]
005cc6c8: mov      w21, #1
005cc6cc: ldrb     w8, [sp, #0x88]
005cc6d0: tbnz     w8, #0, #0x5cc704
005cc6d4: b        #0x5cc70c
005cc6d8: and      x8, x8, x9
005cc6dc: ldr      x9, [sp, #0x68]
005cc6e0: ldr      x9, [x9]
005cc6e4: add      x8, x9, x8, lsl #3
005cc6e8: str      x27, [x8]
005cc6ec: ldr      x8, [x19, #0x28]
005cc6f0: mov      w21, wzr
005cc6f4: add      x8, x8, #1
005cc6f8: str      x8, [x19, #0x28]
005cc6fc: ldrb     w8, [sp, #0x88]
005cc700: tbz      w8, #0, #0x5cc70c
005cc704: ldr      x0, [sp, #0x98]
005cc708: bl       #0x9f6a0
005cc70c: ldrb     w8, [sp, #0x70]
005cc710: tbnz     w8, #0, #0x5cc774
005cc714: cbz      w21, #0x5cc780
005cc718: adrp     x8, #0x8fc000
005cc71c: ldr      x8, [x8, #0x808]
005cc720: ldrb     w9, [sp, #0xd0]
005cc724: ldr      x10, [sp, #0xe0]
005cc728: adrp     x2, #0x7b9000
005cc72c: ldr      x0, [x8]
005cc730: tst      w9, #1
005cc734: csel     x3, x28, x10, eq
005cc738: mov      w1, wzr
005cc73c: ldr      x8, [x0]
005cc740: add      x2, x2, #0xc30
005cc744: ldr      x8, [x8, #0xc8]
005cc748: blr      x8
005cc74c: ldrb     w8, [sp, #0xd0]
005cc750: add      x22, x22, #0x24
005cc754: tbz      w8, #0, #0x5cc78c
005cc758: ldr      x0, [sp, #0xe0]
005cc75c: bl       #0x9f6a0
005cc760: ldr      w8, [x19, #0x3c]
005cc764: add      w20, w20, #1
005cc768: cmp      w20, w8
005cc76c: b.lt     #0x5cbf74
005cc770: b        #0x5cc79c
005cc774: ldr      x0, [sp, #0x80]
005cc778: bl       #0x9f6a0
005cc77c: cbnz     w21, #0x5cc718
005cc780: ldrb     w8, [sp, #0xd0]
005cc784: add      x22, x22, #0x24
005cc788: tbnz     w8, #0, #0x5cc758
005cc78c: ldr      w8, [x19, #0x3c]
005cc790: add      w20, w20, #1
005cc794: cmp      w20, w8
005cc798: b.lt     #0x5cbf74
005cc79c: ldr      x0, [sp, #0x10]
005cc7a0: bl       #0x9efe0
005cc7a4: ldr      w8, [x19, #0x88]
005cc7a8: cbnz     w8, #0x5cc818
005cc7ac: ldp      x8, x9, [x19, #0x70]
005cc7b0: cmp      x9, x8
005cc7b4: b.eq     #0x5cc818
005cc7b8: mov      x9, xzr
005cc7bc: mov      w20, #1
005cc7c0: ldr      x21, [x8, x9, lsl #3]
005cc7c4: ldr      x0, [x21, #0x10]
005cc7c8: cbz      x0, #0x5cc7d4
005cc7cc: bl       #0xa0b80
005cc7d0: str      xzr, [x21, #0x10]
005cc7d4: ldr      x0, [x21, #0x88]
005cc7d8: cbz      x0, #0x5cc7e4
005cc7dc: bl       #0x9fdc0
005cc7e0: str      xzr, [x21, #0x88]
005cc7e4: ldr      x0, [x21, #0x80]
005cc7e8: cbz      x0, #0x5cc7f4
005cc7ec: bl       #0xa15e0
005cc7f0: str      xzr, [x21, #0x80]
005cc7f4: stp      xzr, xzr, [x21, #0x20]
005cc7f8: str      xzr, [x21, #0x18]
005cc7fc: ldp      x8, x10, [x19, #0x70]
