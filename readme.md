## 增加的SD-PPP Features:

1.支持 (https://github.com/RanKaze/kolid-comfy) 中的SDPPPLayout节点.

  (1).使用BranchBooleanNode和BranchToggleNode构造/管理流程.

  (2).relay_expression:构造依赖树维护BranchNodes的数值,可以让branchNode的数值依赖于其它branchNode,自动更新.

  (3).expand_nodes:BranchNode被启用时,会在该branchNode的下方显示对应的节点

  (4).active_nodes:BranchNode被启用时,对应的节点会取消静音,反之启用.

  (5).foldout_nodes:BranchNode被启用时,对应的节点会被展开,反之缩起(这是一个很鸡肋的特性,但是我挺喜欢的)

  (6).hide(海参):该BranchNode不会显示在SDPPPLayout中.

2.支持blocks显示,允许在sdppp-custom.js中,在一个节点的显示下使用blocks来显示额外的节点.(expand_nodes正是如此实现的.)

3.在sdppp-custom.js中提供了onRefresh事件的注册方法.可以缓存一些全局的变量.


## 2.0 Beta is available!

* Support any models and AIApps from `replicate.com` and `www.runninghub.ai`
* No custom nodes needed when using ComfyUI
* New UI, especially for sending images and receiving images.
* Select images with keyboard shortcuts
* Select any area, layer, document in Photoshop quickly!

[> Download 2.0 Beta](https://sdppp.zombee.tech/)

> only available for PS26.0+ (Adobe Photoshop 2025)

## How to use?

* **[Official Website](https://sdppp.zombee.tech/)**

## License  
GPL-3.0

## Source Code  
[sd-ppp/monorepo](https://github.com/sd-ppp/monorepo)

## Thanks
@[AbdullahAlfaraj](https://github.com/AbdullahAlfaraj)
@[tianlang0704](https://github.com/tianlang0704)
@[猫咪老师](https://www.xiaohongshu.com/user/profile/59f1fcc411be101aba7f048f)





