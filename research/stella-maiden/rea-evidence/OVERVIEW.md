# REA證據的公開交付副本

原研究使用 morluto/rea 6.7.0，以本機靜態讀取APK與ARM64 ELF；沒有執行遊戲或連線遊戲服務。此repo保留成功的inventory、檔頭、區段與符號結果，以及原研究Evidence IDs。

**這些是公開交付副本：本機workspace/home路徑已替換，展示文字另正規化換行／行尾空白，並新增_public_handoff_copy註記，不能視為byte-identical原始REA Evidence。** public-copy-index.json區分原檔與公開副本SHA-256；當前副本另由研究包MANIFEST驗證。未發布使用者工具設定或doctor診斷。

- APK inventory原Evidence ID：ev_d319f76006e14ca8335cab197ec954f54762162f1219b3d56cc27a78263ec3df。
- ARM64 headers原ID：ev_d0b26acc6efbfb5ac2aef53953082702fc8deaf60e377e2ec2e84c0fdd14b648。
- ARM64 section headers原ID：ev_1cb9ad251e5c0631fd36f01c612c6be0fb0aa6bb5a2aea59dc3dcba566c3f74f。
- 實際objdump是Apple LLVM 14.0.3；REA通用provider在JSON仍標gnu.objdump，不應據此判斷為GNU實作。
- llvm-arm64-dynamic-symbols.txt是直接LLVM輸出，不是REA Evidence。一般symtab為空，不等於沒有dynsym。
- APK SHA-256：213a1630a5e893f4e5c1e17fc292a04aabfe5c865534c997cb90131624837905。
- ARM64 libStella.so SHA-256：6883fa9383432c981e86c13b8f01b8f227a51d6cf2298dd6c47d3d3774c53f9a。

當時未安裝Ghidra/Hopper/IDA/JADX；REA inventory不等於完成deep decompilation。後續公式與資料schema由LLVM/Capstone/pyelftools及可逆解析補充，詳見reports與index。ELF虛擬位址須按segment映射，不能總當檔案offset。

目前接手AI使用已解析資料不需要REA、Node或原APK；重做原始逆向則另需原始APK與對應工具。本repo不包含工具安裝或原生程式二進位。
