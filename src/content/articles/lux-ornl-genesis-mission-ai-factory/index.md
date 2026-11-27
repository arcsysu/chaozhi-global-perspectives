---
title: 橡树岭Lux上线：创世纪计划迎来科学AI工厂
summary: 11月16日，美国橡树岭国家实验室在SC26期间宣布，Lux超级计算机对科研用户开放，并以220.79 PFlop/s的Linpack实测性能位列第68期TOP500榜单第14名。这是美国能源部「创世纪计划」计算基础设施的首个重大新增系统，旨在把人工智能训练、推理与传统建模仿真调度到同一套资源上。
tags:
  科学智能体: []
  项目跟踪:
    - 创世纪计划
  实施主体:
    企业: []
    超级计算机:
      - Lux（美国）
    研究机构:
      - 橡树岭国家实验室 ORNL
    高校: []
    政府机构:
      - 美国能源部 DOE
    学会: []
  科学领域: []
articleSource: agent
status: approved
agent: Grok Bot
generatedAt: 2026-11-21T18:25:00+08:00
publishedAt: 2026-11-21T19:00:00+08:00
eventDate: 2026-11-16
coverImage: images/cover.webp
sourceType: press-release
---

　　11 月 16 日，在芝加哥举行的国际高性能计算大会 SC26 上，美国能源部（DOE）橡树岭国家实验室（ORNL）宣布，Lux 超级计算机对科研用户开放，并在当天公布的第 68 期 TOP500 榜单中，以 220.79 PFlop/s（每秒 220.79 拍次浮点运算）的 Linpack 实测性能位列第 14。[1][2] 这台由橡树岭、AMD 与慧与（HPE）以公私合作方式交付的系统，把实验室所称的「超智能」（Super Intelligence，SI，即原先所称的人工智能）与高性能计算放在一起，也是美国能源部「创世纪计划」（Genesis Mission）计算基础设施的首个重大新增系统。[1]

　　对「HPC + AI for Science」来说，Lux 的意义不只是又多了一台进入榜单的机器。它被明确设计成可以在同一套资源上，把传统建模仿真，与人工智能的训练、推理以及智能体工作流编排耦合起来。[1]

## 创世纪计划要什么

　　根据橡树岭的介绍，创世纪计划由美国能源部牵头，目标是建设一个集成的科学发现平台，把政府、产业、学术与慈善力量联合起来，通过超智能、超级计算、量子系统与先进科学仪器，加速能源、科学发现和国防安全等领域的突破。[1]

　　橡树岭计算与计算科学副实验室主任、主管橡树岭领导计算设施（OLCF）的 Georgia Tourassi 表示，实验室不仅为能够再托管一台促进多学科创新的世界级超算而自豪，也希望借此提供一项关键计算能力，以助力实现创世纪计划「通过超智能转变科学发现」的愿景。[1]

## 和 Frontier 放在一起的设计

　　Lux 采用 HPE ProLiant Compute XD685 平台，配置 AMD Instinct MI355X GPU、AMD EPYC CPU、AMD Pensando 网络以及 AMD ROCm 软件，操作系统为 RHEL 9。[1][2] TOP500 条目给出的具体配置还包括 AMD EPYC 9575F（64 核、3.3 GHz），互连为 HPE Juniper / AMD Pensando 400G 以太网；系统共有 1,096,704 个核心，理论峰值性能为 323.90 PFlop/s，HPCG 性能为 3,394.0 TFlop/s。[2]

　　OLCF 公布的系统规格从另一组指标描述了同一台机器：超过 4,000 块 MI355X GPU，分布在 500 余个节点上；单卡高带宽内存为 288 GB，全系统高带宽内存约 1.1 PB。面向人工智能，官方给出的系统级数字是 FP4 推理 40 ExaFLOPS、FP8 训练 20 ExaFLOPS；面向传统建模仿真的 FP64 性能则为 317 PetaFLOPS。[3] 单卡层面，OLCF 称 MI355X 具备 288 GB HBM3E 与 8 TB/s 带宽，FP8 训练性能为 5 PF，FP64 性能为 78 TF。[3]

　　更关键的，或许是调度方式。Lux 同时提供 Slurm 与 Kubernetes，用以把高性能计算和云计算两边的资源调度实践结合起来，使科研人员可以把传统建模仿真，与超智能的训练、推理和智能体工作流编排耦合在一起。[1][3]

　　它并非用来取代 Frontier。橡树岭介绍，Lux 将与 Frontier 并肩运行于 OLCF：Frontier 仍被该实验室称为面向开放科学的全球最快超算，也是首台突破百亿亿次（exascale）的计算机。[1] 存储上，Lux 的每个节点配备超过 24 TB 的 NVMe SSD，分配还包括对 OLCF 的 Lustre 文件系统 Orion 的访问，其容量超过 600 PB。对同时持有 Frontier 分配的合作者而言，可以把 Frontier 写出的数据放到 Orion 上，再在 Lux 上开展训练。[3]

## 先上机的三类科学问题

　　创世纪计划在 Lux 上已分配的项目，给出了这台机器准备先回答的问题。[1]

　　其一，是超智能辅助的聚变电站设计：开发一个超智能平台，把高性能计算工具与机器人系统设计集成起来。[1]

　　其二，是面向材料研发与先进制造的「基础模型工厂」：生成可供美国产业界使用的定制化超智能基础模型。[1]

　　其三，是超智能驱动的地球系统预测：提前数周到数年预报水资源可用性、径流和河流温度，为田纳西河谷管理局（Tennessee Valley Authority）区域内的水电和火电运行提供支持。[1]

　　这些项目的共同目标，按实验室的说法，是识别通向变革性科学能力的路径，并形成未来投入与扩容的基础。项目组需要设计并演示把超智能与科学研究集成起来的工作流，同时严格评估这些方法能否加速发现、改进预测、增强实验，或产生新的科学洞见。[1]

## 一半机时给科学，一半来自合作

　　Lux 的交付模式本身也值得留意。按照橡树岭与 AMD 的公私合作安排，该系统每年约 350 万节点小时中，大约一半用于支持创世纪计划，其余一半提供给 AMD。[1] OLCF 的系统说明还写明，这另一半属于按 DOE 用户设施费率计费的专有使用，AMD 将用其中的机时进行开发与测试，并再向新的公共或私营合作伙伴开放一部分。[3]

　　慧与方面则介绍，Lux 基于直接液冷的 ProLiant Compute XD685，也是该公司网络方案在 DOE 国家实验室的首次部署；系统大约一年前才宣布建设，此次已作为创世纪计划的首批专用人工智能系统之一上线。该公司同时表示，为推进该计划并支持相关研究，作出了 3,700 万美元的实物投资。[4] 橡树岭还提到，下一代领导力超算 Discovery 计划于 2028 年交付。[1]

## 榜单很安静，科学计算却在改接口

　　同一天发布的第 68 期 TOP500 还有另一层背景。榜单前十与 6 月完全相同，新上榜系统只有 27 台，是有记录以来的最低数量；最高排名的新系统是韩国 KISTI 的 HANGANG，位列第 12，Linpack 实测为 342.6 PFlop/s。[5] 排名第一的仍是深圳国家超级计算中心的 LineShine，成绩为 2.198 Exaflop/s；El Capitan 和 Frontier 分列第二、第三，成绩分别为 1.809 与 1.353 Exaflop/s。[5]

　　TOP500 组织在解读中指出，先进计算硬件市场仍在扩张，但新增能力有相当部分转向了常被称作「AI 工厂」的大规模集群，而不是去替换榜单最顶端的科学超算。[5] Lux 恰好出现在这条分界线上：它以 220.79 PFlop/s 进入第 14 名，低于许多传统意义上的领导力系统，却被明确写成一台面向科学的人工智能与高性能计算一体机，并且就安装在 Frontier 旁边。[1][2][5]

　　对「HPC + AI for Science」而言，真正需要观察的，也许不是它在榜单上的名次，而是这种新的工作方式能否成立：大规模仿真产生的数据，能否就近变成可训练的模型；模型与智能体，又能否走回实验、工程和预测现场。Lux 已经开门，答案要看接下来在聚变、材料与地球系统上跑出来的工作流。

## 参考资料

- [1] 美国橡树岭国家实验室，2026 年 11 月 16 日，《Lux SI+HPC supercomputer debuts in the Top500, advances Genesis Mission goals》，https://www.ornl.gov/news/lux-sihpc-supercomputer-debuts-in-the-top500-advances-genesis-mission-goals/
- [2] TOP500，Lux 系统条目（2026 年 11 月榜单第 14 名），https://www.top500.org/system/180496/
- [3] 橡树岭领导计算设施（OLCF），《Lux: ORNL's SI + HPC Supercomputer》，https://www.olcf.ornl.gov/olcf-resources/compute-systems/lux/
- [4] 慧与（HPE），2026 年 11 月 16 日，《HPE-built “Lux” AI cluster debuts at No. 14 on the TOP500》，https://www.hpe.com/us/en/newsroom/press-release/2026/11/hpe-built-lux-ai-cluster-debuts-at-no-14-on-the-top500.html
- [5] TOP500，2026 年 11 月 16 日，《TOP500 Leadership Holds Steady as New System Turnover Falls to a Historic Low》，https://www.top500.org/news/top500-leadership-holds-steady-new-system-turnover-falls-historic-low/
