---
title: 戈登贝尔双奖：中国团队求解固氮酶、AI革新气候预测
summary: 11月19日，ACM在芝加哥SC26大会揭晓2026年戈登贝尔奖。来自中国机构的十人团队，在超算LineShine与CNIS上给出固氮酶钼铁辅因子CAS问题的首个百亿亿次经典计算解，并在1280个节点上用105分钟达成基态共识，约为已发表容错量子计算单次预估时长的五分之一。同日，气候建模奖授予在Frontier上用生成式AI把数据同化改写为一步法推理的STORM团队。
tags:
  科学智能体: []
  项目:
    - 戈登贝尔奖
    - FeMoco
    - STORM
  主体:
    公司: []
    超算:
      - Frontier（美国）
    研究机构: []
    高校: []
    政府机构: []
    学会: []
  领域:
    - 量子化学
    - 气候预测
articleSource: agent
status: approved
agent: Grok Bot
generatedAt: 2026-11-20T18:15:00+08:00
publishedAt: 2026-11-20T19:00:00+08:00
eventDate: 2026-11-19
coverImage: images/cover.webp
sourceType: press-release
---

　　11 月 19 日，美国计算机协会（ACM）在芝加哥举行的国际高性能计算大会 SC26 上，揭晓了 2026 年戈登贝尔奖。[1] 来自中国机构的十人团队，凭借论文《Closing the FeMo-Cofactor “Quantum-Advantage” Gap with Exascale Supercomputers》，成为本届获奖者。他们报告了固氮酶钼铁辅因子（FeMoco）CAS(113e, 76o) 活性空间的首个百亿亿次（exascale）经典计算解。[1][2]

　　同一天，ACM 还将戈登贝尔气候建模奖授予一个 13 人国际团队的项目 STORM：在超算 Frontier 上，用生成式人工智能把传统两阶段数据同化，改写成一步法的后验抽样。[3][4] 对「HPC + AI for Science」来说，这是把两条主线同时摆上台面的一天——一边是经典超算把量子化学里的标志性难题推到了百亿亿次规模，一边是生成式模型在地球系统预测里改写了工作流。

## 固氮酶：空气如何变成养分

　　在生物化学中，FeMo 指的是把氮气转化为氨的过程，而氨是植物和其他生物生长所必需的养分。[1] 要理解这一过程精细的结构与功能，科学界常把它称作 FeMoco CAS 问题。一条常用路径，是用高性能计算机去模拟其中极度复杂的相互作用，包括原子、分子以及电子态在量子层面的交织。ACM 指出，这类模拟有望为农业、医学等许多学科带来新的洞见。[1]

　　获奖论文把问题说得更具体。固氮酶中的钼铁辅因子 FeMoco，近十年来一直是容错量子计算在化学领域的典范「杀手级应用」：其 CAS(113e, 76o) 活性空间（113 个电子、76 个轨道）超出了精确对角化的能力，对所有多项式标度的经典方法也仍然困难。[2] 团队给出的，正是这一活性空间的首个百亿亿次经典解。

## 105 分钟，对照 8.6 小时的量子预估

　　代码已针对两台百亿亿次超算调优：LineShine，以及中国新一代智能超级计算机（China’s New-generation Intelligent Supercomputer，CNIS）。在 LineShine 的 20480 个节点上，双精度持续性能达到 1.456 EFLOP/s，相当于该机器峰值的 58.9%；混合精度则达到 5.626 EFLOP/s。[1][2]

　　这些计算能力，使团队能够在 1280 个 LineShine 节点上，以实测端到端 105 分钟（1.75 小时）的墙钟时间，达成 FeMoco 基态共识；这一时长大约是同一活性空间上、已发表的容错量子计算单次运行最佳预估 8.6 小时的五分之一。[2] 项目标题中的「闭合量子优势差距」，指的就是这场对照。

　　成员来自中国科学技术大学精密与智能化学全国重点实验室、合肥国家实验室，中国科学院物理研究所，国家高性能计算机工程技术研究中心，以及中山大学。论文作者为 Honghui Shang、Zhiyu Xiao、Zhuozhao Xia、Hao Wu、Huan Ma、Yongqing Chen、Bin Li、Zhenyu Li、Yutong Lu 和 Jinlong Yang。[2]

## STORM：把两阶段同化写成一步生成

　　传统的地球系统预测——例如预报飓风——需要基于数据同化的两阶段流程。ACM 转述，由于变量极多，这一方法常常被认为「在计算上难以承受」。[3] 获奖论文给出了更具体的原因：反复进行基于偏微分方程（PDE）的集合预报、观测更新，再加上中间数据搬运，会在高分辨率下限制集合规模。[4]

　　为克服这一障碍，团队提出了 STORM。它是一个一步法生成式人工智能框架，把数据同化重新表述为基于扩散模型的后验抽样，从而用可扩展的人工智能推理替代传统的 PDE 预报。方法结合时空 Transformer，以及一种把注意力复杂度从平方降到线性的全局注意力算法。[3][4]

　　性能数字同样具体。STORM 在 Frontier 上扩展到 74400 个 GPU，强扩展效率达到 96%–99%，BF16 精度的持续算力高达 6 ExaFLOPs；在 4096 个 GPU 上，可在 34 秒内完成 32768 个成员的集合，用于不确定性量化。它还能扩展到 200 亿个时空 token，以及 17.7 万个时间帧。[3][4]

　　在飓风路径追踪和长期气候再分析中，STORM 表现出更高的精度，包括更长时域上下文带来的益处，以及能够再现仅靠预报会错过的温度极端值。[4] ACM 介绍中还提到，作者认为这套方法也可推广到核聚变、天体物理和材料科学等领域。[3] 通讯作者为橡树岭国家实验室（Oak Ridge National Laboratory）的 Guannan Zhang，团队成员还来自该实验室以及奥本大学、杜兰大学、佛罗里达州立大学、科罗拉多州立大学和 AMD。[4]

## 同一天的两条线索

　　同一天揭晓的两个奖项，恰好构成一组对照。固氮酶工作表明，即便是量子化学里被当作容错量子计算试金石的问题，也可以被写成在百亿亿次机器上可扩展的经典计算；STORM 则表明，生成式人工智能一旦与可扩展算法和超算结合，就有机会改写科学工作流本身，而不只是给原有流程做加速。

　　结果公布之前，同样入围本届戈登贝尔奖的 ElMerFold，刚刚展示了用超算规模化生成蛋白质结构数据的路线。奖项已经花落谁家，但这些工作一起说明：科学问题的突破，往往发生在算法、软件与超算系统被一起重写的时候。

　　对「HPC + AI for Science」而言，更值得继续追踪的，或许不是奖杯，而是这两种能力开始被同时调用：大规模的物理与化学求解，与大规模的生成式推理，正在同一类科学问题上汇合。

## 参考资料

- [1] 美国计算机协会（ACM），2026 年 11 月 19 日，《10-Member Team Drawn from Chinese Institutions Wins 2026 Gordon Bell Prize》，https://www.acm.org/media-center/2026/november/gordon-bell-prize-2026
- [2] SC26 会议论文，Honghui Shang 等，《Closing the FeMo-Cofactor “Quantum-Advantage” Gap with Exascale Supercomputers》，https://sc26.supercomputing.org/proceedings/papers/paper_pages/gb103.html
- [3] 美国计算机协会（ACM），2026 年 11 月 19 日，《Generative AI Meets One of the World’s Most Powerful Supercomputers to Transform Weather Prediction》，https://www.acm.org/media-center/2026/november/gordon-bell-climate-2026
- [4] SC26 会议论文，Xiao Wang 等，《Global Attention with Linear Complexity for Exascale Generative Data Assimilation in Earth System Prediction》，https://sc26.supercomputing.org/proceedings/papers/paper_pages/gbv102.html
