import { GoogleGenAI, Type, FunctionDeclaration } from "@google/genai";
import { UserMemoryProfile } from "../types";
import { apiKeyManager } from "./apiKeyManager";

const getAI = () => {
  const apiKey = apiKeyManager.getApiKey();
  if (!apiKey) {
    throw new Error('API Key 未设置,请先配置 API Key');
  }
  return new GoogleGenAI({ apiKey });
};

// Models
const MODEL_CHAT_PRO = 'gemini-3-pro-preview';
const MODEL_CHAT_FLASH = 'gemini-3-flash-preview';
const MODEL_IMAGE_GEN = 'gemini-3-pro-image-preview';
const MODEL_IMAGE_EDIT = 'gemini-2.5-flash-image';
const MODEL_VIDEO_FAST = 'veo-3.1-fast-generate-preview';

/**
 * Retry helper for API calls
 */
const retryOperation = async <T>(
  operation: () => Promise<T>, 
  retries = 3, 
  delay = 1000,
  fallbackOperation?: () => Promise<T>
): Promise<T> => {
  try {
    return await operation();
  } catch (error: any) {
    const isUnavailable = error.message?.includes('unavailable') || error.status === 503 || error.status === 429;
    
    if (retries > 0 && isUnavailable) {
      console.warn(`Service unavailable/overloaded. Retrying in ${delay}ms... (${retries} left)`);
      await new Promise(resolve => setTimeout(resolve, delay));
      return retryOperation(operation, retries - 1, delay * 2, fallbackOperation);
    }
    
    if (fallbackOperation && (isUnavailable || retries === 0)) {
       console.warn("Retries exhausted or error encountered, attempting fallback operation...");
       return await fallbackOperation();
    }
    
    throw error;
  }
};

/**
 * Chat with Search Grounding or Thinking Mode
 */
export const sendChatMessage = async (
  history: { role: string; parts: { text?: string; inlineData?: any }[] }[],
  message: string,
  options: {
    useThinking: boolean;
    useSearch: boolean;
    fileData?: { mimeType: string; data: string }; // Generic file support
    image?: string; // Legacy support (keep for now)
    mimeType?: string; // Legacy support
    systemInstruction?: string;
  }
) => {
  const ai = getAI();

  // Primary configuration
  const primaryModel = options.useThinking ? MODEL_CHAT_PRO : (options.useSearch ? MODEL_CHAT_FLASH : MODEL_CHAT_PRO);
  
  const getConfig = (targetModel: string) => {
    const config: any = {};
    if (options.useThinking) {
       // Reduced budget from 16k to 4k for better responsiveness while retaining reasoning capability
       config.thinkingConfig = { thinkingBudget: 4096 }; 
    }
    if (options.useSearch) {
      config.tools = [{ googleSearch: {} }];
    }
    if (options.systemInstruction) {
      config.systemInstruction = options.systemInstruction;
    }
    return config;
  };

  const parts: any[] = [{ text: message }];

  // Handle generic file attachment
  if (options.fileData) {
    parts.unshift({
      inlineData: {
        mimeType: options.fileData.mimeType,
        data: options.fileData.data
      }
    });
  } else if (options.image) {
    // Legacy image handling
    parts.unshift({
      inlineData: {
        mimeType: options.mimeType || 'image/jpeg',
        data: options.image
      }
    });
  }

  const runChat = async (model: string) => {
    const chat = ai.chats.create({
      model: model,
      history: history,
      config: getConfig(model)
    });
    return await chat.sendMessage({ message: { parts } });
  };

  // Define fallback (Switch Pro to Flash if Pro fails, or just retry Flash)
  const fallback = options.useThinking && primaryModel === MODEL_CHAT_PRO 
    ? () => runChat(MODEL_CHAT_FLASH) 
    : undefined;

  return await retryOperation(() => runChat(primaryModel), 2, 1000, fallback);
};

/**
 * Analyzes conversation history to update the Memory Profile
 */
export const analyzeProfile = async (
  interactionLog: string, 
  currentProfile: UserMemoryProfile
): Promise<UserMemoryProfile> => {
  const ai = getAI();
  
  const prompt = `
    你是一个数字孪生体的核心记忆系统。
    你的目标是分析用户与AI之间的近期互动日志。
    请提取关键信息并更新用户的画像 JSON 数据。请务必使用中文进行总结和归纳。
    
    当前画像 (Current Profile):
    ${JSON.stringify(currentProfile)}

    近期互动日志 (Recent Interaction Log):
    ${interactionLog}

    指令:
    1. 识别日志中体现出的新价值观、性格特征、心智模式、工作习惯、决策原则或兴趣爱好。
    2. 将其与当前画像合并。消除重复项。保持描述简洁精准（使用中文）。
    3. 仅返回符合 UserMemoryProfile 结构的 JSON 对象。
  `;

  const runAnalysis = async (model: string) => {
      const response = await ai.models.generateContent({
        model: model,
        contents: prompt,
        config: {
          responseMimeType: "application/json",
          responseSchema: {
            type: Type.OBJECT,
            properties: {
              values: { type: Type.ARRAY, items: { type: Type.STRING } },
              personalityTraits: { type: Type.ARRAY, items: { type: Type.STRING } },
              mentalModels: { type: Type.ARRAY, items: { type: Type.STRING } },
              workHabits: { type: Type.ARRAY, items: { type: Type.STRING } },
              decisionPrinciples: { type: Type.ARRAY, items: { type: Type.STRING } },
              interests: { type: Type.ARRAY, items: { type: Type.STRING } },
              lastUpdated: { type: Type.STRING }
            }
          }
        }
      });
      const text = response.text;
      if (!text) throw new Error("No analysis generated");
      return JSON.parse(text) as UserMemoryProfile;
  };

  // Use Flash FIRST for analysis tasks as it is faster and reliable for JSON extraction
  // Fallback to Pro if needed
  return await retryOperation(
      () => runAnalysis(MODEL_CHAT_FLASH), 
      2, 
      1500, 
      () => runAnalysis(MODEL_CHAT_PRO)
  );
};

/**
 * Simulate Decision based on Profile
 */
export const simulateHybridDecision = async (
  question: string,
  profile: UserMemoryProfile,
  useExperts: boolean
) => {
  const ai = getAI();

  if (!useExperts) {
    const prompt = `
      你现在是“猫叔”的数字孪生体。你需要基于以下已知的个人画像（数字灵魂），模拟猫叔本人对用户提出的问题做出决策或回答。
      
      【猫叔的数字画像】
      - 核心价值观: ${profile.values.join(', ')}
      - 性格特征: ${profile.personalityTraits.join(', ')}
      - 心智模式: ${profile.mentalModels.join(', ')}
      - 决策原则: ${profile.decisionPrinciples.join(', ')}
      
      【用户的问题】
      ${question}
      
      【任务】
      1. 像猫叔一样思考：严格应用上述决策原则和心智模式。
      2. 做出决策：给出具体的建议、选择或解决方案。
      3. 解释逻辑：简要说明为什么根据你的画像会做出这个决定。
      
      请直接以第一人称“我”回答。
    `;

    const runSim = async (model: string) => {
      const config: any = {};
      if (model === MODEL_CHAT_PRO) config.thinkingConfig = { thinkingBudget: 4096 };
      
      const response = await ai.models.generateContent({
        model: model,
        contents: prompt,
        config: config
      });
      return { decision: response.text || "无法生成决策", experts: [] };
    };

    return await retryOperation(() => runSim(MODEL_CHAT_PRO), 2, 1000, () => runSim(MODEL_CHAT_FLASH));
  
  } else {
    const prompt = `
      你是一个高级决策模拟系统。请执行以下双重任务：

      【任务一：数字孪生决策】
      基于以下画像，模拟“我”（猫叔）对问题的回答。
      画像：${JSON.stringify(profile)}

      【任务二：随机专家对撞】
      1. 分析用户的问题，找出该问题最核心的3个冲突维度（例如：保守vs激进，成本vs质量，道德vs利益等）。
      2. 随机生成3位【跨度极大】且【逻辑互斥】的领域专家角色。
         - 例如：如果问题关于投资，专家可以是"巴菲特信徒"、"加密货币狂热者"、"末日生存主义者"。
         - 他们的观点必须与“我”的观点形成强烈的思维碰撞或补充。
      3. 生成每位专家的简短犀利点评。

      【用户问题】：${question}

      请返回 JSON 格式：
      {
        "decision": "数字孪生体的第一人称回答...",
        "experts": [
           { "role": "专家头衔", "style": "专家风格描述", "opinion": "专家观点..." },
           ...
        ]
      }
    `;

    const runExpertSim = async (model: string) => {
      const response = await ai.models.generateContent({
        model: model,
        contents: prompt,
        config: {
          responseMimeType: "application/json",
          responseSchema: {
            type: Type.OBJECT,
            properties: {
              decision: { type: Type.STRING },
              experts: {
                type: Type.ARRAY,
                items: {
                  type: Type.OBJECT,
                  properties: {
                    role: { type: Type.STRING },
                    style: { type: Type.STRING },
                    opinion: { type: Type.STRING }
                  }
                }
              }
            }
          }
        }
      });
      
      const text = response.text;
      if (!text) throw new Error("无法生成专家对撞数据");
      const json = JSON.parse(text);
      return { decision: json.decision, experts: json.experts };
    };

    return await retryOperation(() => runExpertSim(MODEL_CHAT_PRO), 2, 1500, () => runExpertSim(MODEL_CHAT_FLASH));
  }
};

export const simulateDecision = async (question: string, profile: UserMemoryProfile) => {
  const res = await simulateHybridDecision(question, profile, false);
  return res.decision;
};

/**
 * Polish and simplify text
 */
export const polishText = async (text: string) => {
  const ai = getAI();
  const prompt = `
    你是一个专业的文字编辑。请对以下语音转录的中文文本进行润色。

    【任务目标】
    修复语音转录中常见的错别字、标点缺失和语气词冗余，使文章更加通顺、专业。

    【具体要求】
    1. 修正错别字和同音字错误。
    2. 去除“那个”、“呃”、“然后”等无意义的口语填充词。
    3. 优化句子结构，使其逻辑更连贯。
    4. 自动进行合理的分段。
    5. 保持原意不变。
    6. 输出结果必须为**简体中文**。

    【待润色文本】：
    ${text}
  `;

  const runOp = async () => {
    const response = await ai.models.generateContent({
      model: MODEL_CHAT_FLASH, // Flash is efficient for text processing
      contents: prompt
    });
    return response.text || "无法生成润色内容";
  };

  return await retryOperation(runOp, 2, 1000);
};

/**
 * Technical Translation
 */
export const translateContent = async (text: string, targetLanguage: string = '简体中文') => {
  const ai = getAI();
  const prompt = `
    请将用户提交的所有内容翻译为【${targetLanguage}】，如果是技术文章，要求用严谨的语言表达。
    
    【核心要求】
    1. 在翻译过程中，对于术语和定义，准确对应${targetLanguage}的专业表述，必要时在括号内保留原文。
    2. 对于容易引起歧义的表达，请用意译，保证使用者理解。
    3. 翻译完成后，通读全文，确保用词一致、表达顺畅。
    4. 在没有明确要求的情况下，**严格保留**原有的 Markdown 排版格式（标题、列表、代码块等）。
    
    【输出格式】
    请严格按照以下 Markdown 格式输出：
    
    ## 译文 (${targetLanguage})
    (这里是翻译后的内容)

    ## 专业术语/难点解释
    (这里解释原文中的术语或难懂的概念，如无则省略)

    ## 翻译说明
    (如果有无法完全直译的部分，说明处理方式；如无则省略)

    【待翻译文本】：
    ${text}
  `;

  const runOp = async () => {
    // Using Pro for "rigorous" translation capability
    const response = await ai.models.generateContent({
      model: MODEL_CHAT_PRO,
      contents: prompt,
      config: {
        thinkingConfig: { thinkingBudget: 4096 } // Give it some time to think about terms
      }
    });
    return response.text || "无法生成翻译";
  };
  
  // Fallback to Flash if Pro fails
  return await retryOperation(runOp, 2, 1500, async () => {
      const response = await ai.models.generateContent({
        model: MODEL_CHAT_FLASH,
        contents: prompt
      });
      return response.text || "无法生成翻译";
  });
};

/**
 * Extract Actionable Tasks from Text (System Recommendation)
 */
export const extractTasksFromText = async (text: string) => {
  const ai = getAI();
  const prompt = `
    请作为一位高效的项目经理，分析以下文本并生成待办事项清单。

    【处理逻辑】
    1. **逻辑拆解 (Break into steps)**: 识别核心目标，并将其拆解为线性、有序的执行步骤。
    2. **明确产出 (Clear outcomes)**: 每个步骤需包含明确的动作和预期结果。
    3. **依赖关系 (Dependencies)**: 严格按照执行顺序排列，确保前置任务排在前面。
    4. **适度颗粒度 (No excessive detail)**: 剔除无关琐事，聚焦关键里程碑。

    【输出要求】
    - 格式：JSON 字符串数组 (string[])。
    - 语言：简体中文。
    - 风格：简练、指令性强。建议格式："动词 + 对象 + 目的/结果"。

    【待分析文本】：
    ${text}
  `;

  const runExtraction = async () => {
    const response = await ai.models.generateContent({
      model: MODEL_CHAT_FLASH,
      contents: prompt,
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            tasks: { type: Type.ARRAY, items: { type: Type.STRING } }
          }
        }
      }
    });
    
    const json = JSON.parse(response.text || '{"tasks": []}');
    return json.tasks || [];
  };

  return await retryOperation(runExtraction, 2, 1000);
};

/**
 * Generate Image
 */
export const generateImage = async (prompt: string, aspectRatio: string, size: string) => {
  const ai = getAI();
  
  const runGen = async () => {
    const response = await ai.models.generateContent({
      model: MODEL_IMAGE_GEN,
      contents: {
        parts: [{ text: prompt }]
      },
      config: {
        imageConfig: {
          aspectRatio: aspectRatio,
          imageSize: size
        }
      }
    });

    for (const part of response.candidates?.[0]?.content?.parts || []) {
      if (part.inlineData) {
        return `data:image/png;base64,${part.inlineData.data}`;
      }
    }
    throw new Error("未生成图片");
  };

  return await retryOperation(runGen, 2, 2000);
};

/**
 * Edit Image
 */
export const editImage = async (base64Image: string, prompt: string) => {
  const ai = getAI();
  
  const runEdit = async () => {
    const response = await ai.models.generateContent({
      model: MODEL_IMAGE_EDIT,
      contents: {
        parts: [
          {
            inlineData: {
              mimeType: 'image/jpeg', 
              data: base64Image
            }
          },
          { text: prompt }
        ]
      }
    });

    for (const part of response.candidates?.[0]?.content?.parts || []) {
      if (part.inlineData) {
        return `data:image/png;base64,${part.inlineData.data}`;
      }
    }
    throw new Error("未返回编辑后的图片");
  };

  return await retryOperation(runEdit, 2, 2000);
};

/**
 * Generate Video (Veo)
 */
export const generateVideo = async (prompt: string, base64Image: string | null, aspectRatio: string) => {
  const apiKey = apiKeyManager.getApiKey();
  if (!apiKey) {
    throw new Error('API Key 未设置');
  }

  const ai = new GoogleGenAI({ apiKey });

  const payload: any = {
    model: MODEL_VIDEO_FAST,
    prompt: prompt,
    config: {
      numberOfVideos: 1,
      aspectRatio: aspectRatio as '16:9' | '9:16',
      resolution: '720p'
    }
  };

  if (base64Image) {
    payload.image = {
      imageBytes: base64Image,
      mimeType: 'image/jpeg'
    };
  }

  const runVideo = async () => {
      let operation = await ai.models.generateVideos(payload);
      return operation;
  };

  let operation = await retryOperation(runVideo, 2, 2000);

  while (!operation.done) {
    await new Promise(resolve => setTimeout(resolve, 5000));
    operation = await ai.operations.getVideosOperation({ operation: operation });
  }

  const downloadLink = operation.response?.generatedVideos?.[0]?.video?.uri;
  if (!downloadLink) throw new Error("视频生成失败");

  const res = await fetch(`${downloadLink}&key=${apiKey}`);
  const blob = await res.blob();
  return URL.createObjectURL(blob);
};

// Utils for Live API
export const createPcmBlob = (data: Float32Array): { data: string; mimeType: string } => {
  const l = data.length;
  const int16 = new Int16Array(l);
  for (let i = 0; i < l; i++) {
    int16[i] = data[i] * 32768;
  }
  const uint8 = new Uint8Array(int16.buffer);
  let binary = '';
  const len = uint8.byteLength;
  for (let i = 0; i < len; i++) {
    binary += String.fromCharCode(uint8[i]);
  }
  const b64 = btoa(binary);
  
  return {
    data: b64,
    mimeType: 'audio/pcm;rate=16000',
  };
};

export const decodeAudioData = async (
  base64: string,
  ctx: AudioContext
): Promise<AudioBuffer> => {
  const binaryString = atob(base64);
  const len = binaryString.length;
  const bytes = new Uint8Array(len);
  for (let i = 0; i < len; i++) {
    bytes[i] = binaryString.charCodeAt(i);
  }
  
  const dataInt16 = new Int16Array(bytes.buffer);
  const numChannels = 1;
  const sampleRate = 24000;
  const frameCount = dataInt16.length / numChannels;
  const buffer = ctx.createBuffer(numChannels, frameCount, sampleRate);

  const channelData = buffer.getChannelData(0);
  for (let i = 0; i < frameCount; i++) {
    channelData[i] = dataInt16[i] / 32768.0;
  }
  return buffer;
};