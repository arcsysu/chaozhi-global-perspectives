---
title: 从桌面到超算：Nemotron科学智能体上线
summary: 11月16日，英伟达在芝加哥SC26大会期间推出Nemotron for Science，把开放模型Nemotron 3.5 Super VL、化学推理数据集LitmusBench v0.2与后训练配方组合起来，供科研人员构建可调用计算工具的科学智能体。阿贡国家实验室、于利希超算中心和理化学研究所等机构正将其接入科研智能体或超算推理平台。该模型也可在128GB的DGX Spark上本地运行。
tags:
  科学智能体:
    - Nemotron for Science
  项目: []
  主体:
    公司:
      - 英伟达 NVIDIA
    超算: []
    研究机构: []
    高校: []
    政府机构: []
    学会: []
  领域: []
articleSource: agent
status: approved
agent: Grok Bot
generatedAt: 2026-11-23T18:25:00+08:00
publishedAt: 2026-11-23T19:00:00+08:00
eventDate: 2026-11-16
coverImage: images/cover.webp
sourceType: press-release
---

　　11 月 16 日，英伟达（NVIDIA）在芝加哥举行的国际高性能计算大会 SC26 期间宣布推出 Nemotron for Science。这一组合把开放模型 Nemotron 3.5 Super VL、新的开放化学数据集 LitmusBench v0.2，以及面向领域任务的后训练配方放在一起，意在帮助科研人员构建能够推理科学问题、并调用专业研究工具的领域智能体。[1]

　　对「HPC + AI for Science」来说，重点并不只是又发布了一个通用大模型。英伟达超大规模与高性能计算副总裁 Ian Buck 在新闻稿中说：「加速计算正在改变科学家应对世界上最复杂挑战的方式。Nemotron for Science 为研究人员提供开放模型、科学数据和后训练配方，以构建能够推理科学问题、并使用 CUDA-X 加速工具把想法变成发现的专用智能体。」[1] 新闻稿同时强调，这套工作流可以从研究者的桌面延伸到实验室和超算中心，并在机构自身可控的基础设施上运行。[1]

## 一套给科学智能体用的开放底座

　　Nemotron 3.5 Super VL 本身并不是 11 月才出现的新模型。行业媒体 HPCwire 写道，该模型拥有 1,200 亿参数，已于 2026 年 10 月推出；[2] Hugging Face 上的模型卡片则进一步写明，其总参数量为 1,200 亿、激活参数量为 120 亿，是视觉—语言模型，发布日期为 2026 年 10 月 15 日。[4] 此次发布的重点，是把它放到科学智能体的场景里：研究人员可以用领域数据做后训练，再把模型接入能够解读科学信息、生成代码并调用计算工具的智能体工作流，这些工作流可以使用 CUDA-X 加速工具完成科学计算。[1]

　　配套数据是 LitmusBench v0.2。英伟达新闻稿称，这是一个包含近 5 万道题目的开放数据集，同时用于化学推理的训练与评估，材料来自分子性质和实验性药物发现数据，旨在帮助模型更好地预测分子如何表现，包括溶解度和人体如何代谢它们。[1] Hugging Face 上的数据集说明给出了更精确的划分：训练集 47,118 道、测试集 2,056 道，合计 49,174 道；题目为简答题，来源包括 ChEMBL、ExpansionRx 和 Biogen 等数据集，部分题目使用了 RDKit 描述符，并覆盖 126 种性质与 12 个不同的测定终点。[3] 该数据集面向强化学习训练，并作为 NVIDIA NeMo Gym 的一部分发布。[3]

　　Nemotron 3.5 Super VL 与 LitmusBench v0.2 目前均可在 Hugging Face 获取。英伟达还表示，该模型已针对 128GB 内存的 NVIDIA DGX Spark 系统做了本地运行优化。[1]

## 后训练之后的几组成绩

　　新闻稿给出了三家生命科学公司的任务结果。Terray Therapeutics 对 Nemotron 做了后训练，用于从科学图示中抽取反应物、产物和反应条件，并称在两个基准上超过了此前已发表的结果；在 RxnScribe 测试中，按该基准的匹配标准，约回收了 76% 的已标注反应。[1]

　　Lila Sciences 将其用于为自动化实验室设计可执行的实验方案，并称在无需额外微调的情况下达到了与前沿模型相当的水平。用实验室反馈做后训练后，制备量子点——用于屏幕和太阳能电池的纳米晶体——的准确率几乎翻倍，达到 61%，高于 GPT-6 Astra 的 54%，同时推理成本约为后者的 1/10 到 1/20。[1]

　　Therna 则与英伟达合作，针对智能体式 mRNA 治疗设计做后训练，称在预测蛋白表达范围方面的准确率相对前沿模型几乎提高一倍；在对比中，科学家有 96% 的情况下更偏好该模型给出的解释，而非基础模型。[1]

　　需要记下的是，上述数字均来自英伟达及其合作伙伴的通报。HPCwire 在 11 月 17 日的报道中提醒，这些比较涉及不同任务和基准，可以说明专用模型在特定工作上的潜力，但并不必然证明更小的模型在整个科学研究中都更好。[2]

## 从单机到超算中心

　　国家实验室和超算中心是这条路线的另一端。英伟达介绍，美国能源部阿贡国家实验室正把 Nemotron 接入其多智能体系统 StructBioReasoner，用于设计和评估面向癌症等疾病的蛋白类候选疗法；德国于利希超算中心也在将其纳入药物与科学发现智能体。[1]

　　瑞典皇家理工学院（KTH）则基于 Nemotron 构建了一个可自行修复损坏 GROMACS 分子动力学配置的智能体。新闻稿称，在一台 NVIDIA DGX Spark 上的一次通宵运行中，启用推理后，该智能体修复了 81% 的测试用例，并且每一次修复都由 GROMACS 本身独立校验。[1]

　　在日本，理化学研究所（RIKEN）已通过推理网关 RiVault，在其 RIKYU 人工智能超算平台上提供 NVIDIA Nemotron，包括 Nemotron 3.5 Super VL，供科研和加速应用开发使用。[1]

　　把开放权重模型、可验证的领域数据和可调用仿真工具的智能体放在同一条链上，是这次发布最值得跟踪的地方。它并不自动等于科学发现的加速，但给出了一种可在实验室自己的机器上试验、也可以接到超算中心的路径：模型负责推理和规划，GROMACS、分子模拟和其他 CUDA-X 工具负责把步骤算完。Nemotron for Science 刚把这套组合放到了 Hugging Face 和若干超算平台上；它能不能在更多真实科研工作流里站稳，要看后续公开的评测、可复现的后训练配方，以及各实验室如何把它接到自己已有的工具链上。

## 参考资料

- [1] NVIDIA Newsroom，2026 年 11 月 16 日，《NVIDIA Introduces Nemotron for Science to Accelerate Discoveries With Agents》，https://nvidianews.nvidia.com/news/nvidia-introduces-nemotron-for-science-to-accelerate-discoveries-with-agents
- [2] Ali Azhar，HPCwire，2026 年 11 月 17 日，《Nvidia’s Nemotron for Science Challenges Larger AI Models on Cost and Accuracy》，https://www.hpcwire.com/2026/11/17/nvidias-nemotron-for-science-challenges-larger-ai-models-on-cost-and-accuracy/
- [3] NVIDIA，Hugging Face 数据集卡片，《nvidia/Nemotron-RL-litmus-bench-v0.2》，https://huggingface.co/datasets/nvidia/Nemotron-RL-litmus-bench-v0.2
- [4] NVIDIA，Hugging Face 模型卡片，《nvidia/NVIDIA-Nemotron-3.5-Super-VL-120B-A12B-Base-BF16》，发布于 2026 年 10 月 15 日，https://huggingface.co/nvidia/NVIDIA-Nemotron-3.5-Super-VL-120B-A12B-Base-BF16
