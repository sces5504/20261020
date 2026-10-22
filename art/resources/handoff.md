# 四資源圖示 v1

2026-10-22 使用者要求補四種既有資源圖片。image_gen 產生同一張透明 2×2 圖集：左上水晶、右上氣體、左下金屬、右下乙太。AI 原創候選，尚無真人品質核定。沒有新增或更名資源。

主檔 four-resources-v1.png 完整保留；four-resources-v1.webp 是 512×512 網頁輸出（Chromium Canvas，quality .86，不裁切主檔）。圖集各象限256×256，sRGB、alpha、CSS background 200%對齊。resource.sprite 指向共同素材，iconFrame 0..3 明確指定象限，不依檔名猜用途。來源與主檔／輸出 SHA 在 art/catalog/extension-assets.json，runtime hash 同內容包。

提示摘要：Galaxy Angel 科幻二次元遊戲精緻物件圖示、深藍與香檳金屬邊、青色水晶、薄荷綠氣體罐、銀色金屬錠、紫色乙太球，四等分、透明背景、無字、32px 可辨。網頁輸出重建：source scripts/env.sh && node tools/game/encode-resource-art.mjs。
