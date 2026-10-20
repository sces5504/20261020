003f236c: sub      sp, sp, #0x80
003f2370: stp      x28, x27, [sp, #0x20]
003f2374: stp      x26, x25, [sp, #0x30]
003f2378: stp      x24, x23, [sp, #0x40]
003f237c: stp      x22, x21, [sp, #0x50]
003f2380: stp      x20, x19, [sp, #0x60]
003f2384: stp      x29, x30, [sp, #0x70]
003f2388: mov      x23, x4
003f238c: mov      w29, w3
003f2390: mov      w26, w2
003f2394: mov      x24, x1
003f2398: mov      x25, x0
003f239c: stp      x7, x6, [sp]
003f23a0: cbz      x1, #0x3f23d8
003f23a4: ldr      x8, [x24]
003f23a8: mov      w2, #1
003f23ac: mov      x0, x24
003f23b0: mov      x1, x23
003f23b4: ldr      x8, [x8, #0x1e8]
003f23b8: blr      x8
003f23bc: ldr      x8, [x24]
003f23c0: mov      w19, w0
003f23c4: mov      x0, x24
003f23c8: ldr      x8, [x8, #0x1f0]
003f23cc: blr      x8
003f23d0: mov      w22, w0
003f23d4: b        #0x3f23e0
003f23d8: mov      w19, wzr
003f23dc: mov      w22, wzr
003f23e0: ldr      x8, [x25]
003f23e4: mov      w1, #1
003f23e8: mov      x0, x25
003f23ec: ldr      x8, [x8, #0x178]
003f23f0: blr      x8
003f23f4: ldr      x8, [x25]
003f23f8: mov      w21, w0
003f23fc: mov      x0, x25
003f2400: ldr      x8, [x8, #0x150]
003f2404: blr      x8
003f2408: str      w0, [sp, #0x14]
003f240c: cbz      x24, #0x3f2428
003f2410: ldr      x8, [x24]
003f2414: mov      x0, x24
003f2418: ldr      x8, [x8, #0x188]
003f241c: blr      x8
003f2420: mov      w27, w0
003f2424: b        #0x3f242c
003f2428: mov      w27, wzr
003f242c: ldr      w8, [x25, #0x4cc]
003f2430: mov      w15, #0x2d20
003f2434: lsl      w26, w26, #0x10
003f2438: movk     w15, #0xda44, lsl #16
003f243c: cbz      w8, #0x3f251c
003f2440: adrp     x8, #0x8fb000
003f2444: ldr      x8, [x8, #0xef8]
003f2448: mov      w10, #0x37b8
003f244c: mov      w20, #0x2d20
003f2450: movk     w20, #0xda44, lsl #16
003f2454: ldr      x8, [x8]
003f2458: ldr      w9, [x8, #0x37f8]
003f245c: add      x10, x8, x10
003f2460: add      w12, w9, #0xd
003f2464: lsl      x11, x9, #2
003f2468: and      w12, w12, #0xf
003f246c: add      w9, w9, #9
003f2470: ldr      w13, [x10, x11]
003f2474: ldr      w12, [x10, w12, uxtw #2]
003f2478: and      w9, w9, #0xf
003f247c: ldr      w9, [x10, w9, uxtw #2]
003f2480: eor      w14, w12, w13
003f2484: eor      w13, w14, w13, lsl #16
003f2488: eor      w9, w9, w9, lsr #11
003f248c: eor      w12, w13, w12, lsl #15
003f2490: eor      w12, w12, w9
003f2494: str      w12, [x10, x11]
003f2498: ldr      w11, [x8, #0x37f8]
003f249c: eor      w14, w9, w14, lsl #18
003f24a0: eor      w9, w14, w9, lsl #28
003f24a4: and      w12, w15, w12, lsl #5
003f24a8: sub      w11, w11, #1
003f24ac: and      w11, w11, #0xf
003f24b0: str      w11, [x8, #0x37f8]
003f24b4: lsl      x11, x11, #2
003f24b8: ldr      w13, [x10, x11]
003f24bc: eor      w9, w9, w13
003f24c0: eor      w9, w9, w12
003f24c4: eor      w9, w9, w13, lsl #2
003f24c8: str      w9, [x10, x11]
003f24cc: ldr      w8, [x8, #0x37f8]
003f24d0: adrp     x9, #0x76c000
003f24d4: ldr      d1, [x9, #0x2c0]
003f24d8: sxtw     x9, w26
003f24dc: ldr      s0, [x10, x8, lsl #2]
003f24e0: mov      w8, #0x28f0000
003f24e4: ucvtf    d0, d0
003f24e8: fmul     d0, d0, d1
003f24ec: fcvt     s0, d0
003f24f0: fcvtzs   w10, s0, #0x10
003f24f4: add      w10, w10, w10, lsl #2
003f24f8: lsl      w28, w10, #1
003f24fc: smull    x8, w28, w8
003f2500: and      x8, x8, #0xffffffff00000000
003f2504: mov      x10, #0xf33300000000
003f2508: add      x8, x8, x10
003f250c: asr      x8, x8, #0x20
003f2510: mul      x8, x8, x9
003f2514: lsr      x26, x8, #0x10
003f2518: b        #0x3f2528
003f251c: mov      w20, #0x2d20
003f2520: movk     w20, #0xda44, lsl #16
003f2524: mov      w28, #0x50000
003f2528: ldr      x8, [x25]
003f252c: add      x1, sp, #0x18
003f2530: mov      x0, x25
003f2534: ldr      x8, [x8, #0x1d0]
003f2538: blr      x8
003f253c: cbz      w0, #0x3f256c
003f2540: ldr      x8, [sp, #0x80]
003f2544: adrp     x10, #0x8fc000
003f2548: ldr      x10, [x10, #0x168]
003f254c: mov      w9, #1
003f2550: str      w9, [x8]
003f2554: ldrsw    x9, [sp, #0x18]
003f2558: ldrsw    x8, [x10]
003f255c: sub      x8, x8, x9
003f2560: sxtw     x9, w26
003f2564: mul      x8, x8, x9
003f2568: lsr      x26, x8, #0x10
003f256c: cbz      x23, #0x3f259c
003f2570: adrp     x8, #0x8fc000
003f2574: ldr      x8, [x8, #0xd28]
003f2578: adrp     x11, #0x8fc000
003f257c: ldr      w9, [x23, #0x18c]
003f2580: ldrb     w8, [x8]
003f2584: ldr      x11, [x11, #0x340]
003f2588: add      w10, w8, #0x30
003f258c: and      x10, x10, #0xff
003f2590: ldr      w10, [x11, x10, lsl #2]
003f2594: cmp      w10, w9
003f2598: b.ne     #0x3f2604
003f259c: cbz      x24, #0x3f25ec
003f25a0: mov      w9, wzr
003f25a4: cbz      w29, #0x3f25f0
003f25a8: ldr      x8, [x24]
003f25ac: mov      x0, x24
003f25b0: mov      w1, wzr
003f25b4: ldr      x8, [x8, #0x1e0]
003f25b8: blr      x8
003f25bc: cbz      x0, #0x3f25ec
003f25c0: adrp     x8, #0x8fc000
003f25c4: ldr      x8, [x8, #0xd28]
003f25c8: adrp     x10, #0x8fc000
003f25cc: ldr      w9, [x0, #0x18c]
003f25d0: ldrb     w8, [x8]
003f25d4: ldr      x10, [x10, #0x340]
003f25d8: add      w8, w8, #0x30
003f25dc: and      x8, x8, #0xff
003f25e0: ldr      w8, [x10, x8, lsl #2]
003f25e4: cmp      w8, w9
003f25e8: b.ne     #0x3f2a48
003f25ec: mov      w9, wzr
003f25f0: cbz      x23, #0x3f2628
003f25f4: adrp     x8, #0x8fc000
003f25f8: ldr      x8, [x8, #0xd28]
003f25fc: ldrb     w8, [x8]
003f2600: b        #0x3f2608
003f2604: mov      w9, #1
003f2608: adrp     x11, #0x8fc000
003f260c: ldr      w10, [x23, #0x190]
003f2610: ldr      x11, [x11, #0x340]
003f2614: sub      w8, w8, #0x4e
003f2618: and      x8, x8, #0xff
003f261c: ldr      w8, [x11, x8, lsl #2]
003f2620: cmp      w8, w10
003f2624: b.ne     #0x3f27fc
003f2628: mov      w8, wzr
003f262c: ldr      w10, [x25, #0x4cc]
003f2630: cbz      w10, #0x3f2808
003f2634: cbz      w21, #0x3f2714
003f2638: cbnz     w9, #0x3f2714
003f263c: adrp     x9, #0x8fb000
003f2640: ldr      x9, [x9, #0xef8]
003f2644: mov      w11, #0x37b8
003f2648: ldr      x9, [x9]
003f264c: ldr      w10, [x9, #0x37f8]
003f2650: add      x11, x9, x11
003f2654: add      w13, w10, #0xd
003f2658: lsl      x12, x10, #2
003f265c: and      w13, w13, #0xf
003f2660: add      w10, w10, #9
003f2664: ldr      w14, [x11, x12]
003f2668: ldr      w13, [x11, w13, uxtw #2]
003f266c: and      w10, w10, #0xf
003f2670: ldr      w10, [x11, w10, uxtw #2]
003f2674: eor      w15, w13, w14
003f2678: eor      w14, w15, w14, lsl #16
003f267c: eor      w10, w10, w10, lsr #11
003f2680: eor      w13, w14, w13, lsl #15
003f2684: eor      w13, w13, w10
003f2688: str      w13, [x11, x12]
003f268c: ldr      w12, [x9, #0x37f8]
003f2690: eor      w15, w10, w15, lsl #18
003f2694: eor      w10, w15, w10, lsl #28
003f2698: and      w13, w20, w13, lsl #5
003f269c: sub      w12, w12, #1
003f26a0: and      w12, w12, #0xf
003f26a4: str      w12, [x9, #0x37f8]
003f26a8: lsl      x12, x12, #2
003f26ac: ldr      w14, [x11, x12]
003f26b0: eor      w10, w10, w14
003f26b4: eor      w10, w10, w13
003f26b8: eor      w10, w10, w14, lsl #2
003f26bc: str      w10, [x11, x12]
003f26c0: ldr      w9, [x9, #0x37f8]
003f26c4: mov      w10, #0x4dd3
003f26c8: movk     w10, #0x1062, lsl #16
003f26cc: ldr      w9, [x11, x9, lsl #2]
003f26d0: mov      w11, #0x3e8
003f26d4: mul      x10, x9, x10
003f26d8: lsr      x10, x10, #0x26
003f26dc: msub     w9, w10, w11, w9
003f26e0: cmp      w21, w9
003f26e4: b.le     #0x3f2714
003f26e8: adrp     x9, #0x8fc000
003f26ec: ldr      x9, [x9, #0x168]
003f26f0: ldr      w10, [sp, #0x14]
003f26f4: mov      w11, #1
003f26f8: ldr      w9, [x9]
003f26fc: add      w10, w10, w10, lsl #6
003f2700: sub      w9, w9, w10
003f2704: smull    x9, w9, w26
003f2708: lsr      x26, x9, #0x10
003f270c: ldr      x9, [sp]
003f2710: str      w11, [x9]
003f2714: cbz      w19, #0x3f28ec
003f2718: cbnz     w8, #0x3f28ec
003f271c: adrp     x8, #0x8fb000
003f2720: ldr      x8, [x8, #0xef8]
003f2724: mov      w10, #0x37b8
003f2728: ldr      x8, [x8]
003f272c: ldr      w9, [x8, #0x37f8]
003f2730: add      x10, x8, x10
003f2734: add      w12, w9, #0xd
003f2738: lsl      x11, x9, #2
003f273c: and      w12, w12, #0xf
003f2740: add      w9, w9, #9
003f2744: ldr      w13, [x10, x11]
003f2748: ldr      w12, [x10, w12, uxtw #2]
003f274c: and      w9, w9, #0xf
003f2750: ldr      w9, [x10, w9, uxtw #2]
003f2754: eor      w14, w12, w13
003f2758: eor      w13, w14, w13, lsl #16
003f275c: eor      w9, w9, w9, lsr #11
003f2760: eor      w12, w13, w12, lsl #15
003f2764: eor      w12, w12, w9
003f2768: str      w12, [x10, x11]
003f276c: ldr      w11, [x8, #0x37f8]
003f2770: eor      w14, w9, w14, lsl #18
003f2774: eor      w9, w14, w9, lsl #28
003f2778: and      w12, w20, w12, lsl #5
003f277c: sub      w11, w11, #1
003f2780: and      w11, w11, #0xf
003f2784: str      w11, [x8, #0x37f8]
003f2788: lsl      x11, x11, #2
003f278c: ldr      w13, [x10, x11]
003f2790: eor      w9, w9, w13
003f2794: eor      w9, w9, w12
003f2798: eor      w9, w9, w13, lsl #2
003f279c: str      w9, [x10, x11]
003f27a0: ldr      w8, [x8, #0x37f8]
003f27a4: mov      w9, #0x4dd3
003f27a8: movk     w9, #0x1062, lsl #16
003f27ac: ldr      w8, [x10, x8, lsl #2]
003f27b0: mov      w10, #0x3e8
003f27b4: mul      x9, x8, x9
003f27b8: lsr      x9, x9, #0x26
003f27bc: msub     w8, w9, w10, w8
003f27c0: cmp      w19, w8
003f27c4: b.le     #0x3f28ec
003f27c8: adrp     x9, #0x8fc000
003f27cc: ldr      x9, [x9, #0x168]
003f27d0: sxtw     x8, w22
003f27d4: add      x8, x8, x8, lsl #6
003f27d8: sxtw     x10, w26
003f27dc: ldrsw    x9, [x9]
003f27e0: mov      w11, #1
003f27e4: add      x8, x9, x8
003f27e8: mul      x8, x8, x10
003f27ec: lsr      x26, x8, #0x10
003f27f0: ldr      x8, [sp, #8]
003f27f4: str      w11, [x8]
003f27f8: b        #0x3f28ec
003f27fc: mov      w8, #1
003f2800: ldr      w10, [x25, #0x4cc]
003f2804: cbnz     w10, #0x3f2634
003f2808: cbnz     w9, #0x3f2868
003f280c: mov      w10, #0x851f
003f2810: ldr      w9, [x25, #0x4d4]
003f2814: movk     w10, #0x51eb, lsl #16
003f2818: smull    x10, w21, w10
003f281c: lsr      x11, x10, #0x3f
003f2820: asr      x10, x10, #0x25
003f2824: add      w10, w10, w11
003f2828: cmp      w9, w10
003f282c: b.ge     #0x3f2868
003f2830: adrp     x9, #0x8fc000
003f2834: ldr      x9, [x9, #0x168]
003f2838: ldr      x11, [sp]
003f283c: mov      w10, #1
003f2840: ldr      w9, [x9]
003f2844: str      w10, [x11]
003f2848: ldr      w11, [sp, #0x14]
003f284c: ldr      w10, [x25, #0x4d4]
003f2850: add      w11, w11, w11, lsl #6
003f2854: sub      w9, w9, w11
003f2858: smull    x9, w9, w26
003f285c: add      w10, w10, #1
003f2860: lsr      x26, x9, #0x10
003f2864: str      w10, [x25, #0x4d4]
003f2868: cbnz     w8, #0x3f28cc
003f286c: mov      w9, #0x851f
003f2870: ldr      w8, [x25, #0x4d0]
003f2874: movk     w9, #0x51eb, lsl #16
003f2878: smull    x9, w19, w9
003f287c: lsr      x10, x9, #0x3f
003f2880: asr      x9, x9, #0x25
003f2884: add      w9, w9, w10
003f2888: cmp      w8, w9
003f288c: b.ge     #0x3f28cc
003f2890: adrp     x9, #0x8fc000
003f2894: ldr      x9, [x9, #0x168]
003f2898: ldr      x12, [sp, #8]
003f289c: mov      w11, #1
003f28a0: sxtw     x8, w22
003f28a4: ldrsw    x9, [x9]
003f28a8: str      w11, [x12]
003f28ac: ldr      w11, [x25, #0x4d0]
003f28b0: add      x8, x8, x8, lsl #6
003f28b4: sxtw     x10, w26
003f28b8: add      x8, x9, x8
003f28bc: mul      x8, x8, x10
003f28c0: add      w9, w11, #1
003f28c4: lsr      x26, x8, #0x10
003f28c8: str      w9, [x25, #0x4d0]
003f28cc: ldr      w8, [x25, #0x4d8]
003f28d0: add      w8, w8, #1
003f28d4: cmp      w8, #0xa
003f28d8: str      w8, [x25, #0x4d8]
003f28dc: b.ne     #0x3f28ec
003f28e0: movi     d0, #0000000000000000
003f28e4: str      d0, [x25, #0x4d0]
003f28e8: str      wzr, [x25, #0x4d8]
003f28ec: ldr      x8, [x25]
003f28f0: ldr      x29, [sp, #0x88]
003f28f4: mov      w2, #1
003f28f8: mov      w3, #1
003f28fc: ldr      x8, [x8, #0x1f8]
003f2900: mov      x0, x25
003f2904: mov      x1, x24
003f2908: blr      x8
003f290c: cmp      w27, #1
003f2910: bic      w8, w0, w0, asr #31
003f2914: b.lt     #0x3f293c
003f2918: mov      w9, #0x3e8
003f291c: mov      w10, #0x4dd3
003f2920: sub      w9, w9, w27
003f2924: movk     w10, #0x1062, lsl #16
003f2928: mul      w8, w8, w9
003f292c: smull    x8, w8, w10
003f2930: lsr      x9, x8, #0x3f
003f2934: asr      x8, x8, #0x26
003f2938: add      w8, w8, w9
003f293c: cbz      x23, #0x3f2978
003f2940: adrp     x10, #0x8fc000
003f2944: ldr      x10, [x10, #0xd28]
003f2948: adrp     x12, #0x8fc000
003f294c: ldr      w11, [x23, #0x1c]
003f2950: mov      w9, wzr
003f2954: ldrb     w10, [x10]
003f2958: ldr      x12, [x12, #0x340]
003f295c: add      w10, w10, #1
003f2960: and      x10, x10, #0xff
003f2964: ldr      w10, [x12, x10, lsl #2]
003f2968: eor      w10, w10, w11
003f296c: cmp      w10, #0x41
003f2970: mov      w10, w26
003f2974: b.eq     #0x3f29f4
003f2978: cmp      w8, #1
003f297c: b.lt     #0x3f29ec
003f2980: adrp     x9, #0x8fc000
003f2984: ldr      x9, [x9, #0xd28]
003f2988: adrp     x10, #0x8fc000
003f298c: adrp     x11, #0x8fc000
003f2990: ldrb     w9, [x9]
003f2994: ldr      x10, [x10, #0x3e8]
003f2998: ldr      x11, [x11, #0x340]
003f299c: add      w9, w9, #0x42
003f29a0: and      x9, x9, #0xff
003f29a4: ldr      w10, [x10]
003f29a8: ldr      w9, [x11, x9, lsl #2]
003f29ac: sxth     w11, w8
003f29b0: lsl      x11, x11, #0x20
003f29b4: eor      w9, w9, w10
003f29b8: adrp     x10, #0x8fc000
003f29bc: ldr      x10, [x10, #0x168]
003f29c0: add      w9, w9, w8
003f29c4: lsl      w9, w9, #0x10
003f29c8: sxtw     x9, w9
003f29cc: ldrsw    x10, [x10]
003f29d0: sdiv     x9, x11, x9
003f29d4: sub      x9, x10, w9, sxtw
003f29d8: sxtw     x10, w26
003f29dc: mul      x9, x9, x10
003f29e0: lsr      x10, x9, #0x10
003f29e4: mov      w9, w8
003f29e8: b        #0x3f29f4
003f29ec: mov      w9, w8
003f29f0: mov      w10, w26
003f29f4: adrp     x8, #0x8fb000
003f29f8: ldr      x8, [x8, #0xef8]
003f29fc: asr      w10, w10, #0x10
003f2a00: cmp      w10, #1
003f2a04: csinc    w0, w10, wzr, gt
003f2a08: ldr      x8, [x8]
003f2a0c: ldr      w8, [x8, #0x384c]
003f2a10: stp      w26, w9, [x29, #0x14]
003f2a14: stp      w28, w19, [x29, #0x1c]
003f2a18: ldr      w9, [sp, #0x14]
003f2a1c: strh     w8, [x29, #0x10]
003f2a20: str      w22, [x29, #0x24]
003f2a24: stp      w21, w9, [x29, #0x28]
003f2a28: ldp      x29, x30, [sp, #0x70]
003f2a2c: ldp      x20, x19, [sp, #0x60]
003f2a30: ldp      x22, x21, [sp, #0x50]
003f2a34: ldp      x24, x23, [sp, #0x40]
003f2a38: ldp      x26, x25, [sp, #0x30]
003f2a3c: ldp      x28, x27, [sp, #0x20]
003f2a40: add      sp, sp, #0x80
003f2a44: ret
003f2a48: mov      w9, #1
003f2a4c: cbnz     x23, #0x3f25f4
003f2a50: b        #0x3f2628
