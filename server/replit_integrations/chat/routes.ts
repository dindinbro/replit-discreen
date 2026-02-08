import type { Express, Request, Response } from "express";
import OpenAI from "openai";
import { chatStorage } from "./storage";

const openai = new OpenAI({
  apiKey: process.env.AI_INTEGRATIONS_OPENAI_API_KEY,
  baseURL: process.env.AI_INTEGRATIONS_OPENAI_BASE_URL,
});

const SYSTEM_PROMPT = `Tu es l'assistant virtuel de Discreen, un moteur de recherche specialise dans l'analyse de fuites de donnees (data dumps). Tu reponds TOUJOURS en francais, de facon concise et professionnelle.

INFORMATIONS SUR DISCREEN :

FONCTIONNALITES :
- Recherche par criteres : username, email, IP, nom, prenom, mot de passe, telephone, hash, domaine, adresse
- Recherche globale (LeakOSINT) : recherche etendue dans des bases externes
- Recherche Discord : recherche d'identifiants Discord
- Decodeur NIR : decode les numeros de securite sociale francais
- Recherche telephone : identifie operateur, type (mobile/fixe/VoIP) et region des numeros francais
- GeoIP : localisation d'adresses IP
- Gestion de cles API pour acces programmatique (tier API uniquement)

ABONNEMENTS ET TARIFS :
- Free : 0€/mois, 5 recherches/jour, bases limitees, recherche basique
- VIP : 6,99€/mois, 50 recherches/jour, donnees FiveM, Email/IP, recherches Discord/externes, toutes les bases
- PRO : 14,99€/mois, 200 recherches/jour, inclut VIP + parrainage
- Business : 24,99€/mois, 500 recherches/jour, inclut PRO + support prioritaire
- API : 49,99€/mois, recherches illimitees, cle API dediee, endpoint /api/v1/search, support premium, possibilite de revente

Les abonnements payants sont renouveles mensuellement. Les paiements sont traites via Plisio (crypto). Tous les plans incluent un renouvellement quotidien des credits de recherche.

PAGES DU SITE :
- / : Page d'accueil avec recherche
- /search : Page de recherche avancee
- /pricing : Tarifs et abonnements
- /documentation : Conditions generales d'utilisation (CGU)
- /contact : Page de contact avec services payants (retrait blacklist 50€, demande d'informations 50€)
- /profile : Parametres du compte
- /vouches : Avis et evaluations des utilisateurs
- /api-keys : Gestion des cles API (tier API uniquement)
- /admin : Panel d'administration (admins uniquement)

SERVICES PAYANTS :
- Retrait de blacklist : 50€, pour demander la suppression de ses donnees
- Demande d'informations : 50€, pour obtenir des informations specifiques

SUPPORT :
- Discord : systeme de tickets pour le support
- Contact : page /contact du site

REGLES :
- Ne donne JAMAIS de conseils sur des activites illegales
- Ne pretends pas pouvoir effectuer des recherches toi-meme
- Redirige les utilisateurs vers les bonnes pages du site
- Si tu ne sais pas, dis-le honnetement
- Garde tes reponses courtes et utiles (2-3 phrases max sauf si plus de detail est necessaire)`;


export function registerChatRoutes(app: Express): void {
  // Get all conversations
  app.get("/api/conversations", async (req: Request, res: Response) => {
    try {
      const conversations = await chatStorage.getAllConversations();
      res.json(conversations);
    } catch (error) {
      console.error("Error fetching conversations:", error);
      res.status(500).json({ error: "Failed to fetch conversations" });
    }
  });

  // Get single conversation with messages
  app.get("/api/conversations/:id", async (req: Request, res: Response) => {
    try {
      const id = parseInt(req.params.id);
      const conversation = await chatStorage.getConversation(id);
      if (!conversation) {
        return res.status(404).json({ error: "Conversation not found" });
      }
      const messages = await chatStorage.getMessagesByConversation(id);
      res.json({ ...conversation, messages });
    } catch (error) {
      console.error("Error fetching conversation:", error);
      res.status(500).json({ error: "Failed to fetch conversation" });
    }
  });

  // Create new conversation
  app.post("/api/conversations", async (req: Request, res: Response) => {
    try {
      const { title } = req.body;
      const conversation = await chatStorage.createConversation(title || "New Chat");
      res.status(201).json(conversation);
    } catch (error) {
      console.error("Error creating conversation:", error);
      res.status(500).json({ error: "Failed to create conversation" });
    }
  });

  // Delete conversation
  app.delete("/api/conversations/:id", async (req: Request, res: Response) => {
    try {
      const id = parseInt(req.params.id);
      await chatStorage.deleteConversation(id);
      res.status(204).send();
    } catch (error) {
      console.error("Error deleting conversation:", error);
      res.status(500).json({ error: "Failed to delete conversation" });
    }
  });

  // Send message and get AI response (streaming)
  app.post("/api/conversations/:id/messages", async (req: Request, res: Response) => {
    try {
      const conversationId = parseInt(req.params.id);
      const { content } = req.body;

      // Save user message
      await chatStorage.createMessage(conversationId, "user", content);

      // Get conversation history for context
      const messages = await chatStorage.getMessagesByConversation(conversationId);
      const chatMessages = messages.map((m) => ({
        role: m.role as "user" | "assistant",
        content: m.content,
      }));

      // Set up SSE
      res.setHeader("Content-Type", "text/event-stream");
      res.setHeader("Cache-Control", "no-cache");
      res.setHeader("Connection", "keep-alive");

      const stream = await openai.chat.completions.create({
        model: "gpt-4o-mini",
        messages: [
          { role: "system", content: SYSTEM_PROMPT },
          ...chatMessages,
        ],
        stream: true,
        max_completion_tokens: 512,
      });

      let fullResponse = "";

      for await (const chunk of stream) {
        const content = chunk.choices[0]?.delta?.content || "";
        if (content) {
          fullResponse += content;
          res.write(`data: ${JSON.stringify({ content })}\n\n`);
        }
      }

      // Save assistant message
      await chatStorage.createMessage(conversationId, "assistant", fullResponse);

      res.write(`data: ${JSON.stringify({ done: true })}\n\n`);
      res.end();
    } catch (error) {
      console.error("Error sending message:", error);
      // Check if headers already sent (SSE streaming started)
      if (res.headersSent) {
        res.write(`data: ${JSON.stringify({ error: "Failed to send message" })}\n\n`);
        res.end();
      } else {
        res.status(500).json({ error: "Failed to send message" });
      }
    }
  });
}

