import type { ObsidianFileRaw } from '../types/graph';

export const DEMO_OBSIDIAN_FILES: ObsidianFileRaw[] = [
  // Chapter 1: Deep Learning Foundations (深度学习基础)
  {
    path: '01_Deep_Learning_Foundations/01_Neural_Networks.md',
    chapter: '01 Deep Learning Foundations | 深度学习基础',
    fileName: '01 Neural Networks | 神经网络.md',
    content: `# Neural Networks Fundamentals

Artificial neural networks are computational models inspired by biological neural systems. They consist of layered interconnected neurons that transform input features into latent representations using linear projections and non-linear activation functions.

#### Perceptrons and Multi-Layer Architecture | 感知机与多层架构
A single-layer perceptron computes a weighted sum of inputs followed by a step or sigmoid activation function. Deep feedforward networks stack multiple dense layers to approximate arbitrary continuous functions, forming hierarchical representations from low-level features to high-level semantic concepts.

#### Backpropagation and Gradient Descent | 反向传播与梯度下降
Backpropagation calculates the analytical gradient of the loss function with respect to every weight in the network via the calculus chain rule. Stochastic gradient descent (SGD) and adaptive optimizers such as Adam iteratively update parameters along the steepest descent trajectory in high-dimensional loss surfaces.

#### Activation Functions and Non-Linearity | 激活函数与非线性
Without non-linear activation functions like ReLU, GELU, and Leaky ReLU, deep networks would collapse into simple linear transformations. ReLU prevents vanishing gradient issues in positive regimes, while Swish and GELU introduce smooth probabilistic gating properties.
`,
  },
  {
    path: '01_Deep_Learning_Foundations/02_Optimization_Techniques.md',
    chapter: '01 Deep Learning Foundations | 深度学习基础',
    fileName: '02 Optimization Techniques | 优化算法.md',
    content: `# Optimization in Machine Learning

Training deep models requires balancing convergence speed, numerical stability, and generalization capability.

#### Loss Functions and Empirical Risk | 损失函数与经验风险
Common loss functions include cross-entropy loss for classification, mean squared error for regression, and contrastive loss for metric learning. Regularization terms like L2 weight decay constrain model complexity to prevent overfitting on training corpora.

#### Adaptive Learning Rates and Adam | 自适应学习率与Adam
The Adam optimizer maintains exponential moving averages of both past gradients (momentum) and squared gradients (variance scaling). Learning rate warm-up schedules and cosine annealing stabilize optimization during early training phases.

#### Normalization and Batch Normalization | 归一化与批归一化
Batch normalization, layer normalization, and RMSNorm normalize internal feature activations across batch or feature dimensions. This reduces internal covariate shift and allows training with significantly higher learning rates.
`,
  },

  // Chapter 2: Transformer & Attention (Transformer与注意力机制)
  {
    path: '02_Transformers_and_Attention/01_Self_Attention.md',
    chapter: '02 Transformers & Attention | Transformer与注意力机制',
    fileName: '01 Self-Attention Architecture | 自注意力架构.md',
    content: `# The Self-Attention Mechanism

The self-attention mechanism revolutionizes sequence modeling by computing dynamic all-to-all token relationships without recurrent recurrence or convolutional inductive biases.

#### Scaled Dot-Product Attention | 缩放点积注意力
Scaled dot-product attention maps Queries (Q), Keys (K), and Values (V) through matrix multiplication: Attention(Q,K,V) = softmax((Q K^T) / sqrt(d_k)) * V. The scaling factor sqrt(d_k) mitigates vanishing gradients in the softmax exponent for high-dimensional projections.

#### Multi-Head Attention Mechanism | 多头注意力机制
Multi-head attention projects Queries, Keys, and Values into multiple lower-dimensional subspaces concurrently. This allows the model to jointly attend to semantic information from different representation subspaces and positional distances.

#### Positional Encodings and RoPE | 位置编码与旋转位置编码
Because attention operations are permutation invariant, transformers inject sequence order information through sinusoidal positional encodings, learned absolute embeddings, or rotary position embeddings (RoPE) applied to query and key vectors.
`,
  },
  {
    path: '02_Transformers_and_Attention/02_Transformer_Blocks.md',
    chapter: '02 Transformers & Attention | Transformer与注意力机制',
    fileName: '02 Transformer Blocks | Transformer模块.md',
    content: `# Complete Transformer Architecture

A standard transformer block stacks multi-head self-attention and position-wise feed-forward networks (FFN) with residual connections and layer normalization.

#### Residual Connections and LayerNorm | 残差连接与层归一化
Residual connections (skip connections) allow gradients to propagate unimpeded across dozens of transformer layers during backpropagation, effectively bypassing vanishing gradient bottlenecks. Pre-LN structures provide superior stability compared to post-LN.

#### Feed-Forward Networks and SwiGLU | 前馈网络与SwiGLU
The feed-forward sublayer expands the token embedding dimensionality (often by a factor of 4x) before projecting back. Modern architectures utilize SwiGLU gating mechanisms to increase representational expressiveness.

#### Causal Masking and Autoregressive Decoding | 因果掩码与自回归解码
Autoregressive language models apply lower-triangular causal attention masks to prevent tokens from attending to subsequent future positions during generation, maintaining the causal probability factorization.
`,
  },

  // Chapter 3: Large Language Models & NLP (大语言模型与自然语言处理)
  {
    path: '03_LLM_and_NLP/01_Pretraining_and_Scaling.md',
    chapter: '03 LLMs & NLP | 大语言模型与自然语言处理',
    fileName: '01 Pretraining & Scaling | 预训练与缩放定律.md',
    content: `# Pre-training Large Models

Pre-training transforms raw internet-scale text corpora into universal foundational world models via next-token prediction objectives.

#### Tokenization and Byte-Pair Encoding | 分词与BPE算法
Tokenization segments raw unicode strings into discrete token IDs using algorithms like Byte-Pair Encoding (BPE), WordPiece, or Unigram. High-efficiency vocabularies reduce token sequence lengths for multilingual and code data.

#### Scaling Laws and Compute Optimality | 缩放定律与计算最优
Chinchilla scaling laws state that model parameter size and training token volume should scale in equal proportion for compute-optimal pre-training. Empirical power laws predict loss reductions as a function of compute FLOPs.

#### Mixture of Experts (MoE) | 专家混合架构
Mixture of Experts routes each token dynamically to a top-k subset of specialized expert feed-forward networks via a learned router. This decouples total model parameters from active FLOPs per inference forward pass.
`,
  },
  {
    path: '03_LLM_and_NLP/02_Alignment_and_RAG.md',
    chapter: '03 LLMs & NLP | 大语言模型与自然语言处理',
    fileName: '02 Alignment & RAG | 模型对齐与检索增强.md',
    content: `# Alignment and Knowledge Retrieval

Foundational models require alignment techniques and external knowledge retrieval to provide truthful, helpful, and safe interactions.

#### Instruction Tuning and SFT | 指令微调与监督微调
Supervised Fine-Tuning (SFT) trains foundational models on curated prompt-response pairs to instill conversational behavior, reasoning frameworks, and formatting compliance.

#### RLHF and Direct Preference Optimization | 人类反馈强化学习与DPO
Reinforcement Learning from Human Feedback (RLHF) optimizes models against a learned reward function using PPO. Direct Preference Optimization (DPO) algebraically bypasses the separate reward model step to optimize preference loss directly.

#### Retrieval-Augmented Generation (RAG) | 检索增强生成
RAG couples neural encoders with vector databases to retrieve relevant context documents during query time. Supplying retrieved factual grounding into the context window mitigates hallucinations and updates static model knowledge.
`,
  },

  // Chapter 4: Computer Vision & Multimodal (计算机视觉与多模态)
  {
    path: '04_Vision_and_Multimodal/01_Vision_Transformers.md',
    chapter: '04 Vision & Multimodal | 计算机视觉与多模态',
    fileName: '01 Vision Transformers | 视觉Transformer.md',
    content: `# Visual Representation Learning

Modern computer vision has transitioned from standard convolutions to attention-based vision transformers and diffusion backbones.

#### Patch Embedding and ViT Architecture | 图像分块与ViT架构
Vision Transformer (ViT) flattens 2D images into a sequence of non-overlapping 16x16 pixel patches. Linear projection embeds patches into 1D vectors, which are treated identically to text tokens in standard self-attention layers.

#### Convolutional Networks vs Transformers | 卷积网络与Transformer对比
Convolutional networks enforce translation equivariance and local receptive field inductive biases. Vision transformers sacrifice early inductive priors for superior global contextual modeling when pre-trained on massive datasets.

#### Multimodal Contrastive Learning (CLIP) | 多模态对比学习CLIP
CLIP trains vision and text encoders jointly using symmetric cross-entropy loss over batch contrastive pairs. This creates a shared multimodal latent space enabling zero-shot image classification and cross-modal retrieval.
`,
  },
];
