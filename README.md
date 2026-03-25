<div align="center">

# <img src="https://raw.githubusercontent.com/vrcx-team/VRCX/master/images/VRCX.ico" width="64" height="64"> VRCX-地雷Edition

[![GitHub Workflow Status](https://github.com/FuLuTang/VRCX-jirai/actions/workflows/github_actions.yml/badge.svg)](https://github.com/FuLuTang/VRCX-jirai/actions/workflows/github_actions.yml)

### **专为地雷人打造的视奸神器**

</div>

这是 [VRCX](https://github.com/vrcx-team/VRCX) 的魔改分支。原版 VRCX 已经很好用了，但要想成为一名合格的 **地雷男/女**，光知道朋友在不在线怎么够？

你还需要知道 TA 和谁在一起 ~~、去了哪里、待了多久、为什么不陪你玩~~ 👁️...

于是就有了这个版本。

- 可以从 [Releases](https://github.com/FuLuTang/VRCX-jirai/releases/latest) 页面下载最新安装包（`VRCX_Setup.exe`）直接安装。
- 如果想下载测试最新的构建版本，请点击 [GitHub Actions](https://github.com/FuLuTang/VRCX-jirai/actions/workflows/github_actions.yml)。
- 如需从源码构建，请参考下方"从源码构建"说明。

# 核心功能

<div align="left">

- :mag_right: **双人关系查询 (TwoPersonRelationship)** （核心推荐）
    - 从你的好友列表中任选两人，一键查询他们**共同在一个房间待过的所有记录**。
    - **极限细节**：不仅仅是共存时间，还能看到当时“房主是谁”、“最高达到过多少人数”，并且会标记**“你当时在不在场”**。
    - 换句话说：你想知道 A 和 B 到底有多熟吗？数据会告诉你答案。

- :pencil2: **像查代码一样查签名记录 (Bio Diff View)** （新！）
    - 去掉了原版干巴巴的简介历史，新增了一个类似 `Git Diff` 的界面。
    - 朋友改了简介，**红字**代表删掉的话，**绿字**代表加进来的话。到底暗戳戳加了谁的名字还是一眼就能看出来！
    - **24小时智能合并**：一天之内哪怕改了 10 次简介，也会自动合并成一条精简的差异记录。不再满屏垃圾信息。

- :clock3: **关系时间轴 (Relationship Timeline)**
    - 以时间流的形式，直观地列出你的时间分配都花在谁身上了。

- :chart_with_upwards_trend: **房间活动分析 (InstanceActivity)**
    - 可视化展示你进出各房间的活动记录，支持查看单个房间的详细进出历史。

</div>

# 原版体验优化

- :fire: 解锁了 ~~不知为何原版做了但没开放的~~ **热门世界 (HotWorlds)** 功能
    - 统计你在一段时间内（7 天 / 30 天 / 90 天）去得最多的世界，顺便反省一下自己的 VRC 人生。

- **搜索功能增强 (Quick Search)**
    - 在顶部的快捷搜索下拉列表中，额外展示了 **“最近遇到的人”** 和 **“最近加入的世界”**，方便快速查找刚才接触过的玩家和实例。

- **新增好友签名存档工具 (System Tools)**
    - 在“系统工具”中新增了 **“批量拉取并保存好友简介”** 的功能。适合在新设备或者初次使用本软件时，一键将所有好友当前的签名留底存档，以便更好地配合“查简介日志（Bio Diff）”功能使用。

- **状态持续时间计时器修复**
    - 修复了原版 VRCX 在重启后，会把好友当前“在这个房间停留了多久”的计时器强制归零的问题。现在只要好友还在原先的实例中，即使重启软件也会从本地日志恢复真实的加入时间戳，让停留时长显示更加准确。

- **与原版 VRCX 同步**
    - 持续跟进上游 `vrcx-team/VRCX` 更新，比如原版最新的 Electron 40 内核、原版新增的好友热力图等，用着魔改版也能享受最新功能。

# 从源码构建

请参考上游仓库的 [Building from source](https://github.com/vrcx-team/VRCX/wiki/Building-from-source) 说明进行构建。

# Contact 社群
QQ群号: `1043634732`

---

VRCX-jirai Edition is not endorsed by VRChat and does not reflect the views or opinions of VRChat or anyone officially involved in producing or managing VRChat properties. VRChat and all associated properties are trademarks or registered trademarks of VRChat Inc. VRChat © VRChat Inc.

## Star History

[![Star History Chart](https://api.star-history.com/image?repos=FuLuTang/VRCX-jirai&type=date&legend=top-left)](https://www.star-history.com/?repos=FuLuTang%2FVRCX-jirai&type=date&legend=top-left)
