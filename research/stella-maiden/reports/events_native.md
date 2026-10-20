# 事件與劇情指令：名稱、入口與控制流程

EventScript7,809列、EventSpot376列；原生名稱表有124種opcode，包內使用102種，正值入口label185個。這些計數包含控制指令，不等於劇情句子數。原始逐指令證據見 [event_evidence.json](../index/event_evidence.json)，完整關係見 [event_semantics.json](../index/event_semantics.json)。

## 執行結構與重要語義

原生EventScript row stride為0x158。`f02`是opcode，`0x20adb0..0x20add8` 檢查0..123後，使用VA0x760b28的124項相對jump table跳轉；原生命名表位於VA0x8d9b48。資料區須按PT_LOAD映射檔案offset，不可假設VA就是file offset。

`EventScript.f01`是全域入口／跳轉label；lookup函式0x207f74逐列搜尋，選第一個相同label。**它不是row index。** `EventSpot.f04`存這個label，須先查label才取得EventScript列。`EventScript.f00`像分段內行號，但目前只按資料模式推定，不能拿來當全域主鍵。

`Goto`（opcode107）把`f21` float向零取整成label，再搜尋第一個匹配列；此APK唯一一筆位於row711，值144.0，目的label144在row735。直接跳到row144會執行錯誤腳本。一般順序推進在0x20c7fc..0x20c828，但各handler可能等待、改變狀態或跳轉，不能把表每列一律視為同步立即執行。

## 已確認operand

| 表／欄 | 用途／適用opcode |
|---|---|
| EventScript.f01 | global entry/jump label; first matching row is selected |
| EventScript.f02 | opcode 0..123 indexing native 124-case dispatch and native name table |
| EventScript.f21 | opcode-dependent numeric operand; Goto truncates to integer label, not row index |
| EventScript.f30 | general pre-command delay in milliseconds; threshold=uint(f30*0.001*runtime_tick_rate) |
| EventScript.f29 | SpawnLoopStart lifetime milliseconds; 0 -> no lifetime limit; fade duration operand for FadeShow/FadeHide |
| EventScript.f31 | repeat spawn interval milliseconds used by active spawn-loop entries |
| EventScript.f13 | EventSpot row index for StartEventSpot |
| EventScript.f22 | XY override for StartEventSpot; if both components zero retains configured position; SpawnCID XY position converted to 16.16 fixed point |
| EventScript.f09 | CID row index for SpawnCID |
| EventScript.f28 | scene path/name operand for LoadScn |
| EventScript.f32 | sound index passed to audio manager for PlayBGM and PlaySound |
| EventScript.f42/f43/f44 | Japanese/English/Korean inline dialogue text (language identity verified from payload; native selects locale and accesses these slots) |
| EventSpot.f04 | EventScript global entry label; must be resolved by f01 lookup, not array indexing |
| EventSpot.f11/f12 | trigger mode/target SpawnPoint number; mode checks 1 or 2, target compared against selected SpawnPoint.f01 |

延遲f30依 `uint(f30×0.001×runtime_tick_rate)` 轉門檻；tick rate來自執行狀態，尚未在此固定為60。SpawnLoopStart的f29為生命期毫秒，0代表無期限；f31為重複生成間隔。不能把所有f29/f31在所有opcode中解作同一語義。

SpawnCID（47）的f09為CID row索引，f22為XY並轉16.16定點數；LoadScn（48）的f28為場景名；PlayBGM（49）／PlaySound（73）的f32連音效索引。f42/f43/f44分別保存日／英／韓內嵌對話。

## 入口範例

EventSpot[2] `Wrecked1_1` 的f04=200，對應EventScript[508]。多個事件共用label200是合法的共用腳本；不能因此去重事件節點。EventSpot.f05看似第二／結束／fallback label，但這次只確認資料關係，沒有完整確認activation分支。

## 全部原生opcode

下表名稱來自二進位的實際字串表；名稱已確認，不代表每一個operand與副作用都已實作。handler位址是dispatch落點；可與原生反組譯交叉檢查。

| Opcode | Native name | 使用列數 | Dispatch target |
|---:|---|---:|---|
| 0 | Chat | 3304 | 0x20b128 |
| 1 | CheckTabUI | 186 | 0x20addc |
| 2 | CheckSummon | 3 | 0x20b138 |
| 3 | CheckNearPlanet | 1 | 0x20b148 |
| 4 | Spawn | 165 | 0x20b158 |
| 5 | CheckBattleEnd | 0 | 0x20b1ac |
| 6 | CheckNearMyPlanet | 0 | 0x20b1bc |
| 7 | CheckHPDn | 0 | 0x20b1e4 |
| 8 | CheckCCDn | 0 | 0x20b1f4 |
| 9 | Delay | 586 | 0x20c7fc |
| 10 | End | 139 | 0x20b2c4 |
| 11 | CheckWaveEnd | 81 | 0x20b2d0 |
| 12 | GetGirl | 2 | 0x20b2dc |
| 13 | CheckNearDist | 121 | 0x20b2ec |
| 14 | Sleep | 45 | 0x20c7fc |
| 15 | EventStart | 28 | 0x20b2fc |
| 16 | CheckEventEnd | 54 | 0x20b308 |
| 17 | RetreatSpawned | 2 | 0x20b314 |
| 18 | SpawnLoopStart | 38 | 0x20b320 |
| 19 | SpawnLoopStop | 0 | 0x20b330 |
| 20 | EventStop | 15 | 0x20b33c |
| 21 | CheckSpawnDestroyed | 32 | 0x20b370 |
| 22 | CheckEventPercent | 18 | 0x20b3ec |
| 23 | CheckNearDest | 1 | 0x20b43c |
| 24 | ShowNotice | 0 | 0x20b448 |
| 25 | CheckNearEventSpot | 36 | 0x20b458 |
| 26 | GetName | 1 | 0x20b464 |
| 27 | WaitNextStep | 0 | 0x20c7fc |
| 28 | ChatScriptS | 19 | 0x20b48c |
| 29 | ChatScriptM | 3 | 0x20b49c |
| 30 | ChatScriptE | 10 | 0x20b4ac |
| 31 | ChatScriptF | 1 | 0x20b4bc |
| 32 | CheckScienceLv | 0 | 0x20c834 |
| 33 | CheckDragHero | 0 | 0x20b4cc |
| 34 | CheckTouchEnemy | 2 | 0x20b514 |
| 35 | CheckDragEnemy | 0 | 0x20b524 |
| 36 | CheckBattleStart | 1 | 0x20b59c |
| 37 | ChatScriptForce | 1 | 0x20b5ac |
| 38 | ChatScriptLimit | 1 | 0x20b5c8 |
| 39 | Move | 123 | 0x20b5f4 |
| 40 | MoveTarget | 3 | 0x20b604 |
| 41 | CamZoom | 0 | 0x20b614 |
| 42 | CamFocus | 139 | 0x20b6cc |
| 43 | FadeShow | 183 | 0x20b6dc |
| 44 | FadeHide | 176 | 0x20b730 |
| 45 | SpawnHero | 7 | 0x20b774 |
| 46 | ClearHero | 0 | 0x20b784 |
| 47 | SpawnCID | 570 | 0x20b790 |
| 48 | LoadScn | 89 | 0x20b7a0 |
| 49 | PlayBGM | 287 | 0x20b7b0 |
| 50 | Attack | 2 | 0x20b808 |
| 51 | HideSkillUI | 4 | 0x20b818 |
| 52 | CheckMoveHero | 9 | 0x20b87c |
| 53 | DeleteHero | 28 | 0x20b88c |
| 54 | DeleteDeathHero | 0 | 0x20b89c |
| 55 | NewHero | 2 | 0x20b8c4 |
| 56 | AddHeroToDeck | 3 | 0x20b8d4 |
| 57 | SetAutoSkill | 13 | 0x20b8e4 |
| 58 | DeleteHeroAll | 18 | 0x20b8f4 |
| 59 | SpawnFx | 176 | 0x20b904 |
| 60 | CamShake | 19 | 0x20b914 |
| 61 | SpawnPlanets | 23 | 0x20b990 |
| 62 | SpawnSpawnPoints | 68 | 0x20ba18 |
| 63 | SpawnGalaxyGates | 0 | 0x20ba28 |
| 64 | SpawnMyHeroes | 85 | 0x20badc |
| 65 | ClearMyHeroes | 6 | 0x20bb40 |
| 66 | StartEventSpot | 42 | 0x20bba8 |
| 67 | EndEventSpot | 42 | 0x20bbb8 |
| 68 | CheckSpawnPointDestroyed | 13 | 0x20bbf0 |
| 69 | HideEscort | 3 | 0x20bc00 |
| 70 | CheckHPBelow | 61 | 0x20bc20 |
| 71 | SetDisable | 11 | 0x20bc30 |
| 72 | ChangeTeam | 24 | 0x20bc40 |
| 73 | PlaySound | 6 | 0x20bc50 |
| 74 | SpawnUIFx | 6 | 0x20bc94 |
| 75 | ShowNotice2 | 0 | 0x20bca4 |
| 76 | HideTargetArrow | 22 | 0x20bcb4 |
| 77 | HideUI | 86 | 0x20bcd0 |
| 78 | DisableUserInput | 191 | 0x20bce8 |
| 79 | FollowCID | 16 | 0x20bd04 |
| 80 | CheckNearDistCID | 1 | 0x20bd14 |
| 81 | FollowMyHero | 102 | 0x20bd7c |
| 82 | DeleteFx | 52 | 0x20bd8c |
| 83 | CamReset | 2 | 0x20be40 |
| 84 | SetHP | 1 | 0x20be50 |
| 85 | UnlockPlanet | 48 | 0x20be60 |
| 86 | InitMgrNavi | 1 | 0x20be70 |
| 87 | StopBGM | 10 | 0x20be88 |
| 88 | ShowQuestUI | 1 | 0x20beb8 |
| 89 | HideQuestUI | 1 | 0x20bed0 |
| 90 | CheckCameraMove | 1 | 0x20bed8 |
| 91 | WarpPos | 3 | 0x20bee8 |
| 92 | ClearTarget | 0 | 0x20bef8 |
| 93 | CheckTabUIForce | 1 | 0x20addc |
| 94 | CheckTabUISkill | 1 | 0x20addc |
| 95 | CheckTabUIBuild | 0 | 0x20addc |
| 96 | SetRetreat | 2 | 0x20bf60 |
| 97 | HideMenu | 2 | 0x20bf70 |
| 98 | SetCamDist | 46 | 0x20bf8c |
| 99 | SpawnPID | 33 | 0x20c018 |
| 100 | SetDisableAttack | 15 | 0x20c028 |
| 101 | StopSound | 0 | 0x20c090 |
| 102 | DisableMenu | 0 | 0x20c0cc |
| 103 | PatrolFullRangeOp | 0 | 0x20c174 |
| 104 | SkillPlayOff | 6 | 0x20c190 |
| 105 | CheckCIDNumBelow | 4 | 0x20c1c8 |
| 106 | PatrolZeroRangeOp | 2 | 0x20c1d8 |
| 107 | Goto | 1 | 0x20c228 |
| 108 | CheckTabUIDeploy | 4 | 0x20addc |
| 109 | CheckTabUIRecovery | 1 | 0x20addc |
| 110 | CheckTabUIMap | 1 | 0x20c294 |
| 111 | SpawnCoord | 1 | 0x20c2a4 |
| 112 | CheckCoord | 1 | 0x20c30c |
| 113 | CheckAddSummon | 3 | 0x20c318 |
| 114 | StartDefence | 1 | 0x20c35c |
| 115 | CheckDefenceEnd | 1 | 0x20c36c |
| 116 | PushHeroSort | 2 | 0x20c37c |
| 117 | PopHeroSort | 2 | 0x20c3e0 |
| 118 | StartBoss | 1 | 0x20c428 |
| 119 | CheckBossEnd | 1 | 0x20c438 |
| 120 | ChatLocal | 1 | 0x20c448 |
| 121 | OpenTask | 1 | 0x20c4a8 |
| 122 | CloseTask | 0 | 0x20c4ec |
| 123 | CloseAllWnd | 0 | 0x20c548 |

## 重建與未知邊界

可據此建立事件VM的opcode註冊表、label→首列映射、對話／音效／場景／生成指令的資料介面。尚未完成102種已使用opcode的全部operand、所有Check條件、事件佇列／同步、戰鬥結束、發獎與存檔交易；也未以原版逐tick比較。名稱包含Check、End或Reward不能單獨證明完整觸發條件。

索引與證據可由 `python3 research/tools/index_event_semantics.py` 重建；本報告由 `build_event_report.py` 產生。
