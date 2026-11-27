---
title: 从排队到常在线：TACC推出Sagebrush
summary: 11月18日，得克萨斯高级计算中心（TACC）宣布正在建设面向全美开放科学共同体的常在线人工智能推理服务Sagebrush。该项目由美国国家科学基金会资助，将与NSF领导级计算设施并行运行，提供开放模型、检索增强生成和面向领域的智能体工作流，硬件以SambaNova加速器为主。官方记录显示资助额为4,999,956美元，期限至2028年8月31日；TACC希望在2027年秋季开放新的机时申请。
tags:
  科学智能体:
    - Sagebrush
  项目跟踪:
    - NAIRR
  实施主体:
    企业: []
    超级计算机: []
    研究机构:
      - 得克萨斯高级计算中心 TACC
    高校: []
    政府机构:
      - 美国国家科学基金会 NSF
    学会: []
  科学领域: []
articleSource: agent
status: approved
agent: Grok Bot
generatedAt: 2026-11-24T18:12:48+08:00
publishedAt: 2026-11-24T19:00:00+08:00
eventDate: 2026-11-18
coverImage: images/cover.webp
sourceType: press-release
---

　　11 月 18 日，美国得克萨斯大学奥斯汀分校的得克萨斯高级计算中心（TACC）宣布，正在建设一项名为 Sagebrush 的人工智能推理服务，面向全美开放科学共同体提供常在线的模型与工具访问。[1] 与传统的批量排队超算不同，Sagebrush 以一组持续运行的服务来工作。[1] 该项目由美国国家科学基金会（NSF）资助，将与 NSF 领导级计算设施（Leadership-Class Computing Facility，LCCF）并行运行，并支持其使命。[1] TACC 在新闻稿副题中写明，这项资助将使科研人员免费使用人工智能模型、智能体工具和面向领域的工作流。[1]

　　对「HPC + AI for Science」而言，这件事的要点并不只是又增加了一批加速器，而是把推理从超算的排队队列里拆了出来。科学仿真仍然需要超算；但越来越多的科研步骤——写代码、查文献、调用领域工作流——开始依赖低延迟的模型推理。如果这些请求和大规模模拟抢同一套机器，两边都会受影响。SambaNova 联合创始人兼首席执行官 Rodrigo Liang 在公司新闻稿中说：「科学仍然运行在超算上，而其中越来越多的部分现在也运行在人工智能上。」在他看来，研究人员需要能够快速响应的大模型，同时「不应占用那些为仿真而建的机器」。[3]

## 给开放科学用的常在线推理

　　NSF 计算机与信息科学及工程学部（CISE）高级科学与工程顾问 Katie Antypas 说：「Sagebrush 是一项重要的 NSF 投入，为研究人员提供了一种新的、可持续使用的方式，把开放模型和智能体工具用到他们最困难的科学问题上。它与 NSF LCCF 配对，并连接到 NAIRR，从而扩展了把新兴能力转化为新科学发现所需的国家研究基础设施。」[1]

　　TACC 数据与人工智能部的 Niall Gaffney 则把目标说得更具体：「就其核心而言，我们希望提供帮助人们开展研究的人工智能推理服务，并支持更针对特定领域的智能体工作流。」[1][3]

　　按照 TACC 的介绍，Sagebrush 将支持一般的人工智能查询，以及面向领域工作流的托管检索增强生成（RAG）服务。[1] 其中还包括一套用 LCCF 文档以及其他高性能计算与人工智能代码示例调校的 RAG 服务，供现有的编码智能体系统调用，以辅助更专业的高性能计算代码编写和故障分析。[1] TACC 的系统说明页还写道，它将通过 OpenAI 兼容的 API 层驱动，便于接入已有的人工智能客户端；同时提供基于网页的聊天机器人和配置了 JupyterAI 的 Jupyter 环境，供不想自行配置客户端的用户使用，并计划与 NSF 资助的 HPCGpt 等项目合作，以改善 NSF 计算基础设施上的高性能计算使用。[4]

　　TACC 还强调，它将与领导 NSF 资助的国家人工智能研究资源（NAIRR）运营中心的圣地亚哥超级计算机中心合作，协助把 NAIRR 从试点阶段转入可持续的国家研究基础设施；Sagebrush 也将支撑 TACC 对「NAIRR：科学超级智能基础设施」（NAIRR: Super Intelligence Infrastructure for Science）的贡献。[1]

## 硬件、资助与仍待明确的细节

　　推理服务的硬件以 SambaNova 的人工智能芯片为主。TACC 称，该中心已在早期访问、非生产环境中使用过这些芯片；并正在额外采购四套系统，以扩大常用开放模型的容量，预计于 2026 年 11 月交付。[1] SambaNova 的软件栈名为 SambaStack，包含其专有的推理处理器与编译器；其余软件则主要依赖开源的智能体框架，以及支撑 RAG 应用的向量存储。[1]

　　SambaNova 在 11 月 17 日的新闻稿中称，TACC 将在现有部署上增加机架，使系统规模扩大到原来的三倍；并写道，此次扩展得到 NSF 一项 500 万美元资助的支持，其中 350 万美元用于采购人工智能加速器硬件。[3] 美国国家科学基金会的官方资助记录可以核对总金额与周期：奖项编号 2537075，题目为「Category II: Sagebrush - An AI Inference Resource for ACCESS, NAIRR, and the Nation」，合作协议的接收方为得克萨斯大学奥斯汀分校，首席研究员为 Niall I. Gaffney，资助额为 4,999,956 美元，起止日期为 2026 年 9 月 15 日至 2028 年 8 月 31 日。[5] TACC 系统说明页则介绍，Sagebrush 将使用 12 个 SambaNova SN40 节点，并希望在 2027 年秋季开放新的机时申请；机时分配将与 LCCF、ACCESS 和 NAIRR 等机构共同设计。[4]

　　仍有一些关键细节不宜写死。行业媒体 HPCwire 在同日报道中提醒：此次宣布并未说明新采购的系统将使用 SambaNova 较早的芯片，还是该公司今年早些时候推出的 SN50；也没有列出研究人员将能使用哪些开放模型，以及扩展后的系统将如何具体开放访问。[2] TACC 的「四套额外系统」与 SambaNova 的「扩大到三倍」、以及系统页上的「12 个 SN40 节点」，目前也还不能简单换算成同一组数字。把这些说法并置，是为了让读者看到已公开的部分，而不是把不同口径压成一个尚未证实的规模。

## 时间表与合作伙伴

　　TACC 写道，该项 NSF 资助始于 2026 年 9 月 15 日，与官方记录一致。[1][5] 按其规划，前两年为试验阶段，用于建立支持体系、了解用户需求，并探索服务的自筹使用，进度也可能加快；随后三年为生产阶段。[1] 需要记下的是，基金会目前公布的合作协议截止日期为 2028 年 8 月 31 日，与「试验两年、再生产三年」的五年描述并不完全重合，后续是否续约或追加资助，仍要以官方记录为准。[5]

　　未来 6 到 12 个月，TACC 将建立新的、可随模型与服务扩展的分配机制，把 Sagebrush 纳入其现有分配系统，并把较旧的硬件迁入用户可使用的服务。[1] 中心正在寻找有具体使用场景的早期用户。[1] 它还将与同样在探索基于 SambaNova 的科研推理的洛斯阿拉莫斯国家实验室交流信息。[1]

　　把常在线推理做成国家开放科学基础设施的一部分，是这次发布最值得跟踪的地方。它并不自动等于科学发现会因此加快，但给出了一条清楚的分工：超算继续承担大规模仿真和训练，推理服务则让模型、RAG 和智能体可以随时被调用。Sagebrush 目前仍处在建设与早期访问之后的扩展阶段；它能不能成为科研人员真正用得上的公共能力，要看 2027 年的分配办法、最终开放的模型清单，以及它与 LCCF、NAIRR 之间的工作流能否接得上。

## 参考资料

- [1] Faith Singer，TACC，2026 年 11 月 18 日，《TACC Launches Sagebrush, An Always-On AI Inference Service for the Nation’s Open Science Community》，https://tacc.utexas.edu/news/latest-news/2026/11/18/tacc-launches-sagebrush-an-always-on-ai-inference-service-for-the-nations-open-science-community/
- [2] Ali Azhar，HPCwire，2026 年 11 月 18 日，《SambaNova and TACC Triple Down on AI Inference for Science》，https://www.hpcwire.com/2026/11/18/sambanova-and-tacc-triple-down-on-ai-inference-for-science/
- [3] SambaNova，2026 年 11 月 17 日，《SambaNova Expands TACC Partnership, Tripling SambaStack Deployment to Accelerate Scientific AI》，https://sambanova.ai/press/sambanova-expands-tacc-partnership-tripling-sambastack-deployment-to-accelerate-scientific-ai
- [4] TACC 系统说明，《Sagebrush: An AI inference resource for ACCESS, NAIRR, and the nation》，https://tacc.utexas.edu/systems/sagebrush/
- [5] 美国国家科学基金会资助记录，奖项编号 2537075，《Category II: Sagebrush - An AI Inference Resource for ACCESS, NAIRR, and the Nation》，https://www.nsf.gov/awardsearch/showAward?AWD_ID=2537075
