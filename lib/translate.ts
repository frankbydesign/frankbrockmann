import Anthropic from '@anthropic-ai/sdk'

const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY!,
})

export type TranslationResult = {
  originalText: string
  translatedText: string | null
  detectedLanguage: string
  isEnglish: boolean
  error?: string
}

/**
 * Detects language and translates to English if needed
 * Only translates non-English text
 */
export async function translateToEnglish(text: string): Promise<TranslationResult> {
  try {
    const prompt = `You are a language detector and translator.

Analyze this text and respond with a JSON object:
- If the text is in English, return: {"language": "en", "needsTranslation": false}
- If the text is in another language, return: {"language": "<ISO-639-1 code>", "needsTranslation": true, "translation": "<English translation>"}

Text: "${text}"

Respond ONLY with valid JSON, no other text.`

    const message = await anthropic.messages.create({
      model: 'claude-3-5-haiku-20241022',
      max_tokens: 1024,
      messages: [{ role: 'user', content: prompt }],
    })

    const responseText = message.content[0].type === 'text'
      ? message.content[0].text
      : ''

    const result = JSON.parse(responseText)

    if (result.needsTranslation) {
      return {
        originalText: text,
        translatedText: result.translation,
        detectedLanguage: result.language,
        isEnglish: false,
      }
    } else {
      return {
        originalText: text,
        translatedText: null,
        detectedLanguage: 'en',
        isEnglish: true,
      }
    }
  } catch (error) {
    console.error('Translation error:', error)
    return {
      originalText: text,
      translatedText: null,
      detectedLanguage: 'unknown',
      isEnglish: false,
      error: error instanceof Error ? error.message : 'Translation failed',
    }
  }
}

/**
 * Translates English text to target language
 */
export async function translateFromEnglish(
  text: string,
  targetLanguage: string
): Promise<{ translatedText: string | null; error?: string }> {
  // If target is English, no translation needed
  if (targetLanguage === 'en') {
    return { translatedText: text }
  }

  try {
    const languageNames: { [key: string]: string } = {
      es: 'Spanish',
      fr: 'French',
      so: 'Somali',
      hmn: 'Hmong',
      vi: 'Vietnamese',
      ar: 'Arabic',
      zh: 'Chinese',
      ko: 'Korean',
      // Add more as needed
    }

    const targetLangName = languageNames[targetLanguage] || targetLanguage

    const prompt = `Translate this English text to ${targetLangName}. Respond ONLY with the translation, no other text:

"${text}"`

    const message = await anthropic.messages.create({
      model: 'claude-3-5-haiku-20241022',
      max_tokens: 1024,
      messages: [{ role: 'user', content: prompt }],
    })

    const translatedText = message.content[0].type === 'text'
      ? message.content[0].text.trim()
      : null

    return { translatedText }
  } catch (error) {
    console.error('Translation error:', error)
    return {
      translatedText: null,
      error: error instanceof Error ? error.message : 'Translation failed',
    }
  }
}
