/**
 * 智谱ChatGLM客户端
 */

import { LLMClient, LLMRequest, LLMResponse, LLMConfig } from './types.js';
import { buildChatPrompt } from './prompt.js';

export class ZhipuClient implements LLMClient {
  private config: LLMConfig;
  private apiKey: string | null = null;

  constructor() {
    this.config = this.loadConfig();
    this.apiKey = this.getApiKey();
  }

  private loadConfig(): LLMConfig {
    return {
      provider: 'zhipu',
      model: 'glm-4-flash',
    };
  }

  private getApiKey(): string | null {
    const envKey = process.env.ZHIPU_API_KEY;
    if (envKey) {
      console.log('[智谱] 使用环境变量API Key');
      return envKey;
    }
    if (this.config.apiKey) {
      console.log('[智谱] 使用配置文件API Key');
      return this.config.apiKey;
    }
    console.log('[智谱] API Key未配置');
    return null;
  }

  isAvailable(): boolean {
    return this.apiKey !== null;
  }

  async chat(request: LLMRequest): Promise<LLMResponse> {
    if (!this.apiKey) {
      return {
        content: '智谱API Key未配置，请设置环境变量ZHIPU_API_KEY',
        success: false,
        timestamp: Date.now(),
        error: 'API Key未配置',
      };
    }

    try {
      const prompt = buildChatPrompt(
        request.messages[request.messages.length - 1].content,
        request.context
      );

      const response = await this.callZhipuAPI(prompt);

      return {
        content: response,
        success: true,
        timestamp: Date.now(),
      };
    } catch (error: any) {
      console.error('[智谱] 调用失败:', error);
      return {
        content: `抱歉，智谱服务出现错误: ${error.message}`,
        success: false,
        timestamp: Date.now(),
        error: error.message,
      };
    }
  }

  async simpleChat(message: string, memoryContext?: string): Promise<string> {
    const response = await this.chat({
      messages: [{ role: 'user', content: message }],
      context: memoryContext ? { memoryContext } : undefined,
    });
    return response.content;
  }

  /**
   * 多模态对话：支持图片+文本 (GLM-4V)
   */
  async imageChat(message: string, imageBase64: string, memoryContext?: string): Promise<string> {
    if (!this.apiKey) {
      return '智谱API Key未配置，请设置环境变量ZHIPU_API_KEY';
    }

    const contextPrefix = memoryContext ? `【记忆上下文】\n${memoryContext}\n\n` : '';
    const fullPrompt = `${contextPrefix}${message}`;

    const content: any[] = [
      { type: 'text', text: fullPrompt },
      { type: 'image_url', image_url: { url: imageBase64 } },
    ];

    try {
      const response = await this.callVisionAPI(content);
      return response;
    } catch (error: any) {
      console.error('[智谱] 图片识别失败:', error);
      return `图片识别失败: ${error.message}`;
    }
  }

  private async callVisionAPI(content: any[]): Promise<string> {
    const url = 'https://open.bigmodel.cn/api/paas/v4/chat/completions';
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 60000);

    try {
      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${this.apiKey}`,
        },
        body: JSON.stringify({
          model: 'GLM-4.6V-FlashX',
          messages: [{ role: 'user', content }],
          temperature: 0.7,
          max_tokens: 2048,
        }),
        signal: controller.signal,
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`API请求失败: ${response.status} - ${errorText}`);
      }

      const data = await response.json() as any;
      return data.choices[0].message.content;
    } finally {
      clearTimeout(timeout);
    }
  }

  private async callZhipuAPI(prompt: string): Promise<string> {
    const url = 'https://open.bigmodel.cn/api/paas/v4/chat/completions';

    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${this.apiKey}`,
      },
      body: JSON.stringify({
        model: this.config.model || 'glm-4-flash',
        messages: [
          {
            role: 'user',
            content: prompt,
          },
        ],
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`API请求失败: ${response.status} - ${errorText}`);
    }

    const data = await response.json() as any;
    return data.choices[0].message.content;
  }
}

export function createZhipuClient(): ZhipuClient {
  return new ZhipuClient();
}
