# Setup Instructions: AI Help Assistant for NexusBank

Follow these steps to configure, run, and connect the fully automated AI Chat Assistant to your application.

## 1. Prerequisites (MongoDB)
This project is already configured to connect to your MongoDB Atlas database via `backend/config/db.js`. Ensure your main `.env` file in the `backend/` directory has a valid `MONGO_URI`.

```ini
MONGO_URI=mongodb+srv://<username>:<password>@cluster.mongodb.net/nexusbank
```

## 2. API Key Setup (Gemini AI SDK)
The intelligent Chatbot falls back to an AI API processor when questions aren't predefined.

1. Navigate to the `backend/` directory.
2. Open or create the `.env` file.
3. Add your Gemini API key (you can grab this from Google AI Studio).

```ini
GEMINI_API_KEY=your-gemini-api-key-here
```
*(If no API key is provided, the chatbot will safely display a fallback message informing you no key is available while still allowing predefined answers to work perfectly).*

## 3. Start the Backend Server
The chatbot requires the updated Node server to run so it can process intents and log chat history (`ChatMessage` database collection).

1. Open your terminal.
2. Navigate to the backend directory:
   ```bash
   cd backend
   ```
3. Start the server:
   ```bash
   node server.js
   ```
   *You should see "MongoDB Connected" and "Server running on port 5000".*

## 4. Run the Client Web App
You can simply open `index.html` or `dashboard.html` in your browser.
Alternatively, use an extension like VSCode Live Server.

## 5. Overview of Features
*   **Database Integration**: Every query you send via the floating Chat UI saves to the MongoDB `chatmessages` collection, preserving your interactions permanently for potential review.
*   **Floating Chat Widget**: Integrated beautifully across `index.html` and `dashboard.html`.
*   **Quick Options**: Instead of typing queries manually, click the predefined capsules to instantly trigger responses.
*   **Typing Animation**: Real-time "Processing your request..." animations give users immediate feedback that operations are taking place behind the scenes!
