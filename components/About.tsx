import React from 'react';

const FeatureCard: React.FC<{ icon: string; title: string; items: string[]; color: string }> = ({ icon, title, items, color }) => (
  <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100 hover:shadow-lg transition-all duration-300 hover:-translate-y-1">
    <div className={`text-4xl mb-4 ${color}`}>{icon}</div>
    <h3 className="text-lg font-bold text-gray-800 mb-3">{title}</h3>
    <ul className="space-y-2">
      {items.map((item, idx) => (
        <li key={idx} className="text-gray-600 text-sm flex items-start gap-2">
          <span className="text-gray-300 mt-1">•</span>
          <span className="leading-relaxed">{item}</span>
        </li>
      ))}
    </ul>
  </div>
);

const About: React.FC = () => {
  return (
    <div className="h-full overflow-y-auto bg-gray-50 text-gray-800 animate-fade-in">
      {/* Hero Section */}
      <div className="relative bg-gradient-to-br from-indigo-900 via-blue-900 to-slate-900 text-white p-12 overflow-hidden">
        {/* Abstract Background Decoration */}
        <div className="absolute top-0 right-0 w-96 h-96 bg-blue-500 rounded-full mix-blend-overlay filter blur-3xl opacity-20 -translate-y-1/2 translate-x-1/2"></div>
        <div className="absolute bottom-0 left-0 w-64 h-64 bg-purple-500 rounded-full mix-blend-overlay filter blur-3xl opacity-20 translate-y-1/2 -translate-x-1/2"></div>
        
        <div className="relative z-10 max-w-4xl mx-auto text-center py-10">
          <div className="inline-block px-3 py-1 bg-white/10 rounded-full text-xs font-medium tracking-wider mb-4 border border-white/20">
            MirrorAI v2.3
          </div>
          <h1 className="text-4xl md:text-5xl font-extrabold tracking-tight mb-6 bg-clip-text text-transparent bg-gradient-to-r from-blue-200 to-indigo-100">
            不仅仅是 AI，它是数字世界的你。
          </h1>
          <p className="text-xl md:text-2xl text-blue-100 font-light mb-8 max-w-2xl mx-auto leading-relaxed">
            一套能够持续生长、复刻你价值观与决策逻辑的<br/>数字生命系统。
          </p>
        </div>
      </div>

      <div className="max-w-6xl mx-auto px-6 -mt-10 relative z-20 pb-16">
        {/* Intro Card */}
        <div className="bg-white rounded-2xl p-8 shadow-lg border border-gray-100 mb-12 text-center">
          <p className="text-gray-600 text-lg leading-relaxed max-w-4xl mx-auto">
            在这个信息爆炸的时代，我们需要的不是另一个冷冰冰的问答机器，而是一个深刻理解我们的<strong>“第二大脑”</strong>。
            本系统通过深度学习你的日常对话、语音流和决策偏好，逐步构建出你的<strong>数字画像（Digital Profile）</strong>。
            它不仅是你的效能工具，更是你思维的镜子，帮助你从第三视角审视自我，实现认知的迭代与升级。
          </p>
        </div>

        {/* Feature Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-16">
          <FeatureCard 
            icon="🧠" 
            title="数字灵魂 (The Digital Soul)" 
            color="text-purple-500"
            items={[
              "实时画像：告别黑盒，系统将实时提取并可视化你的核心价值观、性格特征、心智模式和决策原则。",
              "动态生长：每一次交互都是一次“喂养”。系统会根据对话内容自动优化画像，让数字分身越来越像你。"
            ]} 
          />
          <FeatureCard 
            icon="⚖️" 
            title="决策模拟器 & 专家对撞" 
            color="text-indigo-500"
            items={[
              "数字分身决策：在面临两难选择时，让 AI 调取你的历史价值观，模拟你会做出的决定。",
              "随机专家对撞：打破思维茧房！自动生成3位逻辑互斥的顶级领域专家与你的数字分身进行激烈的思维辩论。"
            ]} 
          />
          <FeatureCard 
            icon="💬" 
            title="深度交互系统" 
            color="text-blue-500"
            items={[
              "自由对话：具备“深度思考 (Thinking)”能力的聊天伙伴，支持联网搜索与多模态输入。",
              "记忆同步：独创的“记忆更新”机制。一键将新的认知注入系统的长期记忆库。"
            ]} 
          />
           <FeatureCard 
            icon="⚡" 
            title="效能与创作" 
            color="text-amber-500"
            items={[
              "语音智能润色：内置专业编辑引擎，将碎片的语音转化为逻辑严密的书面文章。",
              "提示词专家：集成高级 Prompt Engineering 工作流，精准定义任务意图。",
              "创意工坊：集成 Gemini 图像与 Veo 视频生成模型，灵感瞬间具象化。"
            ]} 
          />
        </div>

        {/* Workflow / Tech Section */}
        <div className="bg-gradient-to-r from-gray-900 to-slate-800 rounded-3xl p-8 md:p-12 text-white relative overflow-hidden">
          <div className="relative z-10 flex flex-col md:flex-row items-center justify-between gap-8">
            <div className="flex-1">
              <h3 className="text-2xl font-bold mb-4">Under the Hood</h3>
              <p className="text-gray-300 mb-6 leading-relaxed">
                本系统由 <strong>Google Gemini 3.0 Pro</strong> 提供核心推理能力，结合 <strong>Gemini 2.5 Flash</strong> 处理高并发任务。
                视频生成由 <strong>Veo</strong> 模型驱动。
                <br/><br/>
                所有记忆画像本地存储，确保您的数字隐私安全。
              </p>
              <div className="flex gap-3">
                <span className="px-3 py-1 rounded bg-white/10 text-xs border border-white/20">Privacy First</span>
                <span className="px-3 py-1 rounded bg-white/10 text-xs border border-white/20">Multi-Modal</span>
                <span className="px-3 py-1 rounded bg-white/10 text-xs border border-white/20">Live API</span>
              </div>
            </div>
            
            <div className="flex items-center gap-4 opacity-80">
               <div className="text-center">
                  <div className="text-3xl font-bold">Gemini</div>
                  <div className="text-xs text-gray-400">Pro & Flash</div>
               </div>
               <div className="text-2xl text-gray-600">×</div>
               <div className="text-center">
                  <div className="text-3xl font-bold">Veo</div>
                  <div className="text-xs text-gray-400">Video Gen</div>
               </div>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="text-center mt-12 text-gray-400 text-sm">
          <p>© 2024 猫叔的数字孪生系统. All rights reserved.</p>
        </div>
      </div>
    </div>
  );
};

export default About;