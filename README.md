# OnTrack

A Taiwan railway train schedule PWA. Built with <a href="https://vite.dev/">Vite</a>, <a href="https://react.dev/">React</a>, and <a href="https://vercel.com/">Vercel</a>.

The app shows real-time train schedules between stations, automatically suggests the next departing train, and provides a quick share feature to send arrival time messages. Perfect for daily commuters who need a simple way to coordinate rides.

The UI is currently in Traditional Chinese, tailored for Taiwanese commuters. Internationalization (i18n) support is planned for future releases.

## Access the App

**Live App**: [hsi-on-track.vercel.app](https://hsi-on-track.vercel.app/)

### Install as PWA (Add to Home Screen)

OnTrack is a Progressive Web App — install it for a native app-like experience:

**iOS (Safari)**:

1. Open the app in Safari
2. Tap the **Share** button (bottom center)
3. Select **"Add to Home Screen"**

**Android (Chrome)**:

1. Open the app in Chrome
2. Tap the **⋮** menu (top right)
3. Select **"Add to Home screen"** or **"Install app"**

## Features

- Real-time train schedules from TDX (Transport Data eXchange)
- Auto-detect nearest station using geolocation
- Smart suggestion of next departing trains
- Quick message sharing
- PWA support for mobile installation

## Install to run locally (requires [Node.js](https://nodejs.org/) 20.x)

1. Clone the repository:
    ```bash
    git clone https://github.com/Hsiii/OnTrack.git
    ```
2. Navigate to the project directory:
    ```bash
    cd OnTrack
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
- **Styling**: pure CSS
- **API**: TDX Taiwan Railway API with Vercel serverless functions
- **Deployment**: Vercel
