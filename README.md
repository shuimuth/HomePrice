# Home Price Experiment Game

A web-based single-player simulation game for behavioral economics research, studying how housing prices affect risk preferences and financial decision-making.

## Project Structure

```
HomePrice/
├── server/                 # Backend (Node.js + Express + SQLite)
│   ├── index.js           # Express server entry point
│   ├── config.js          # Centralized game configuration parameters
│   ├── db.js              # SQLite database initialization & helpers
│   ├── routes.js          # RESTful API route handlers
│   └── package.json       # Node.js dependencies
├── client/                # Frontend (Phaser 3 + HTML/CSS)
│   ├── index.html         # Entry page
│   ├── js/                # JavaScript modules
│   │   ├── api.js         # API communication module
│   │   ├── main.js        # Phaser game initialization
│   │   └── scenes/        # Phaser scene files
│   ├── css/               # Stylesheets
│   │   └── style.css      # Global styles
│   └── assets/            # Game assets (images, etc.)
└── README.md
```

## Getting Started

### Prerequisites

- Node.js >= 18.x

### Installation & Running

1. Install server dependencies:

```bash
cd server
npm install
```

2. Start the server:

```bash
npm start
```

3. Open browser and navigate to:

```
http://localhost:3000/?uid=TEST001
```

The `uid` parameter is required — it identifies each experiment participant.

### Configuration

All game parameters (salary, house prices, lottery settings, etc.) can be adjusted in `server/config.js` without modifying game logic.

### Data Export

Export all participant data as CSV:

```
GET http://localhost:3000/api/export?password=research2026
```

## Tech Stack

- **Frontend**: Phaser 3 (game engine) + HTML/CSS (form UI)
- **Backend**: Node.js + Express
- **Database**: SQLite (via better-sqlite3)
