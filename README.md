# MomComePickMeUp

A Taiwan railway train schedule app that helps you notify your mom when to pick you up from the station. Built with <a href="https://vite.dev/">Vite</a>, <a href="https://react.dev/">React</a>, and <a href="https://vercel.com/">Vercel</a>.

The app shows real-time train schedules between stations, automatically suggests the next departing train, and provides a quick share feature to send pickup time messages. Perfect for daily commuters who need a simple way to coordinate rides home.

## Features

- Real-time train schedules from TDX (Transport Data eXchange)
- Auto-detect nearest station using geolocation
- Smart suggestion of next departing train
- Quick message sharing with customizable templates
- PWA support for mobile installation
- Dark mode optimized UI

## Installation (requires [Node.js](https://nodejs.org/) 20.x)

1. Clone the repository:
    ```bash
    git clone https://github.com/yourusername/MomComePickMeUp.git
    ```
2. Navigate to the project directory:
    ```bash
    cd MomComePickMeUp
    ```
3. Install dependencies:
    ```bash
    npm install
    ```
4. Set up environment variables:
   Create a `.env` file with your TDX API credentials:
    ```
    VITE_TDX_CLIENT_ID=your_client_id
    VITE_TDX_CLIENT_SECRET=your_client_secret
    ```
5. Run the development server:
    ```bash
    vercel dev
    ```

## Building for production

1. Generate a production build:
    ```bash
    npm run build
    ```
2. Preview the site:
    ```bash
    npm run preview
    ```

## Tech Stack

- **Frontend**: React 19 + TypeScript
- **Build Tool**: Vite 7
- **Styling**: CSS with custom properties
- **API**: TDX Taiwan Railway API
- **Deployment**: Vercel with serverless functions
- **Icons**: Lucide React
