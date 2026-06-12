const GEMINI_ENDPOINT = 'https://generativelanguage.googleapis.com/v1beta/models';

const readJsonBody = async (req) => {
  if (req.body && typeof req.body === 'object') return req.body;

  const chunks = [];
  for await (const chunk of req) {
    chunks.push(Buffer.from(chunk));
  }

  const rawBody = Buffer.concat(chunks).toString('utf8');
  return rawBody ? JSON.parse(rawBody) : {};
};

const extractJson = (text) => {
  const cleaned = String(text || '')
    .replace(/^```json\s*/i, '')
    .replace(/^```\s*/i, '')
    .replace(/```$/i, '')
    .trim();

  try {
    return JSON.parse(cleaned);
  } catch {
    const firstBrace = cleaned.indexOf('{');
    const lastBrace = cleaned.lastIndexOf('}');
    if (firstBrace >= 0 && lastBrace > firstBrace) {
      return JSON.parse(cleaned.slice(firstBrace, lastBrace + 1));
    }
    throw new Error('Gemini retornou uma resposta sem JSON valido.');
  }
};

const normalizeCategoryName = (category) => {
  const clean = String(category || '').trim();
  if (!clean) return '';
  return clean.charAt(0).toUpperCase() + clean.slice(1);
};

const normalizeItems = (items, categories) => {
  const allowedCategories = Array.isArray(categories) && categories.length > 0
    ? categories.map(String)
    : ['Bebidas', 'Petiscos', 'Sobremesas', 'Outros'];
  const outputCategories = new Set(allowedCategories);
  const seen = new Set();

  const normalizedItems = (Array.isArray(items) ? items : [])
    .map((item) => {
      const name = String(item?.name || '').trim();
      const price = Number(String(item?.price ?? '').replace(',', '.').replace(/[^\d.]/g, ''));
      const suggestedCategory = normalizeCategoryName(item?.category) || allowedCategories[0];
      const category = suggestedCategory.length > 30 ? allowedCategories[0] : suggestedCategory;
      const description = String(item?.description || '').trim();
      const confidence = Number(item?.confidence ?? 0);
      const duplicateKey = `${name.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[^a-z0-9]/g, '')}-${price.toFixed(2)}`;

      if (!name || Number.isNaN(price) || price < 0 || seen.has(duplicateKey)) return null;

      seen.add(duplicateKey);
      outputCategories.add(category);
      return {
        name,
        price,
        category,
        description,
        confidence: Number.isNaN(confidence) ? 0 : Math.max(0, Math.min(1, confidence))
      };
    })
    .filter(Boolean)
    .slice(0, 120);

  return {
    items: normalizedItems,
    categories: Array.from(outputCategories)
  };
};

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    return res.status(405).json({ error: 'Metodo nao permitido.' });
  }

  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    return res.status(500).json({ error: 'Configure GEMINI_API_KEY no ambiente do servidor.' });
  }

  try {
    const { imageBase64, mimeType = 'image/jpeg', images, categories = [] } = await readJsonBody(req);

    const imageInputs = Array.isArray(images)
      ? images
      : [{ imageBase64, mimeType }];

    const validImages = imageInputs
      .map((image) => ({
        imageBase64: image?.imageBase64,
        mimeType: image?.mimeType || 'image/jpeg'
      }))
      .filter((image) => typeof image.imageBase64 === 'string' && image.imageBase64.length > 0)
      .slice(0, 8);

    if (validImages.length === 0) {
      return res.status(400).json({ error: 'Nenhuma imagem em base64 foi enviada.' });
    }

    const allowedCategories = Array.isArray(categories) && categories.length > 0
      ? categories.map(String)
      : ['Bebidas', 'Petiscos', 'Sobremesas', 'Outros'];
    const model = process.env.GEMINI_MODEL || 'gemini-2.5-flash-lite';
    const prompt = `
Voce e uma IA especialista em cardapios de barracas de praia, quiosques, bares e restaurantes no Brasil.
Analise a foto do cardapio fisico e extraia todos os produtos visiveis.
Voce pode receber varias fotos de cardapios diferentes da mesma barraca. Consolide tudo em uma lista unica.

Regras:
- Retorne somente JSON valido, sem markdown.
- Use exatamente esta estrutura: {"categories":["string"],"items":[{"name":"string","category":"string","price":number,"description":"string","confidence":number}]}.
- Categorias existentes: ${allowedCategories.join(', ')}.
- Use categorias existentes quando fizer sentido, mas crie categorias novas se o cardapio tiver uma secao clara que nao existe.
- Se houver preco promocional e preco normal, use o preco de venda mais provavel.
- Se o mesmo produto aparecer em varias fotos, mantenha apenas uma versao.
- Nao invente itens que nao aparecem na imagem.
- Corrija acentos e capitalizacao em portugues quando estiver obvio.
- Description deve ser curta e util, baseada no texto visivel ou no tipo do produto.
- Confidence deve ir de 0 a 1.
`;

    const geminiResponse = await fetch(`${GEMINI_ENDPOINT}/${model}:generateContent?key=${apiKey}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [
          {
            role: 'user',
            parts: [
              { text: prompt },
              ...validImages.map((image) => ({
                inline_data: {
                  mime_type: image.mimeType,
                  data: image.imageBase64
                }
              }))
            ]
          }
        ],
        generationConfig: {
          temperature: 0.1,
          responseMimeType: 'application/json'
        }
      })
    });

    const geminiBody = await geminiResponse.json();

    if (!geminiResponse.ok) {
      return res.status(geminiResponse.status).json({
        error: geminiBody?.error?.message || 'Erro ao chamar Gemini.'
      });
    }

    const text = geminiBody?.candidates?.[0]?.content?.parts?.map((part) => part.text || '').join('\n');
    const parsed = extractJson(text);
    const normalized = normalizeItems(parsed.items, [
      ...allowedCategories,
      ...(Array.isArray(parsed.categories) ? parsed.categories.map(String) : [])
    ]);

    return res.status(200).json({
      items: normalized.items,
      categories: normalized.categories,
      model
    });
  } catch (error) {
    console.error('Erro no importador de cardapio com Gemini:', error);
    return res.status(500).json({
      error: error instanceof Error ? error.message : 'Erro inesperado ao importar cardapio.'
    });
  }
}
