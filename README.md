# Welcome to your Lovable project

This project was built with [Lovable](https://lovable.dev).

## Build with Lovable

Open your project in the [Lovable editor](https://lovable.dev) and keep building.

- **Ship faster**: describe what you want to build and Lovable handles the code.
- **Stay in sync**: connect the project to GitHub and every change made in Lovable is committed straight to your repository.
- **Full ownership**: this code is yours. Push to your repository and your changes sync back into Lovable, ready for your next prompt.

## Development

Prefer working locally? You need Node.js and npm — [install with nvm](https://github.com/nvm-sh/nvm#installing-and-updating).

```sh
git clone <this-repository-url>
cd <repository-name>
npm i
npm run dev
```

## Configure AI

To use Groq locally, add a Groq API key to `MediAssist-AI/.env`:

```env
GROQ_API_KEY=your_groq_api_key
```

Restart the development server after changing `.env`. The app uses Groq's
Qwen 3.8 27B vision model by default for prescription image analysis. To use a
different Groq model, set `GROQ_MODEL` to a model available to your Groq account.
For compatibility with older setup instructions, a Groq key beginning with
`gsk_` is also recognized if it was mistakenly put in `GEMINI_API_KEY`.
Never commit or share API keys.

## Built with

- TanStack Start
- TypeScript
- React
- Tailwind CSS
