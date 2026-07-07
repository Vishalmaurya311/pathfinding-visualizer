# 🧭 Pathfinding Visualizer

An interactive web application for visualizing and comparing popular pathfinding algorithms. The project is built using **HTML5**, **CSS3**, and **Vanilla JavaScript (ES2023)** with a modular architecture and no frontend frameworks.

![Vanilla JS](https://img.shields.io/badge/Vanilla-JS-f7df1e)
![No Framework](https://img.shields.io/badge/Framework-None-success)
![License](https://img.shields.io/badge/License-MIT-blue)

---

## 📖 Overview

This project helps users understand how different pathfinding algorithms work by visualizing each step of the search process on an interactive grid. It includes multiple algorithms, maze generation, animation controls, algorithm comparison, and performance statistics, making it useful for learning graph traversal concepts.

---

## ✨ Features

### Pathfinding Algorithms

* Breadth First Search (BFS)
* Depth First Search (DFS)
* Dijkstra's Algorithm
* A* Search
* Greedy Best-First Search
* Bellman-Ford Algorithm

### Maze Generation

* Multiple animated maze generation techniques
* Random wall generation
* Instant or animated generation

### Interactive Grid

* Draw and erase walls
* Place weighted cells
* Drag and reposition start and destination nodes
* Clear board or reset path

### Animation Controls

* Start, Pause, Resume, Stop
* Replay visualization
* Step-by-step execution
* Frame-by-frame mode
* Multiple animation speed options

### Comparison Mode

* Run two algorithms side by side
* Compare execution time
* Compare visited nodes
* Compare path length

### Educational Features

* Live visualization of algorithm execution
* Step-by-step explanation
* Data structure visualization
* Complexity information
* Algorithm description and pseudocode

### Statistics

* Nodes visited
* Path length
* Execution time
* Estimated memory usage
* Grid information

### User Experience

* Multiple color themes
* Keyboard shortcuts
* Undo & Redo
* Responsive layout
* Accessibility support
* Procedural sound effects using the Web Audio API

---

## 🛠️ Tech Stack

* HTML5
* CSS3
* Vanilla JavaScript (ES2023)
* ES Modules
* Web Audio API
* Local Storage

---

## 📂 Project Structure

```text
Pathfinding-Visualizer/
│
├── index.html
├── css/
│   └── main.css
│
├── js/
│   ├── app.js
│   ├── cell.js
│   ├── grid.js
│   ├── controls.js
│   ├── settings.js
│   ├── animation.js
│   ├── utils.js
│   ├── uiController.js
│   │
│   ├── algorithms/
│   │   ├── bfs.js
│   │   ├── dfs.js
│   │   ├── dijkstra.js
│   │   ├── astar.js
│   │   ├── greedy.js
│   │   └── bellmanFord.js
│   │
│   └── dataStructures/
│       ├── queue.js
│       ├── stack.js
│       ├── minHeap.js
│       └── priorityQueue.js
│
├── assets/
└── README.md
```

---

## 🚀 Getting Started

### Clone the repository

```bash
git clone https://github.com/your-username/Pathfinding-Visualizer.git
```

### Open the project

Open the project folder in **Visual Studio Code**.

### Run locally

Since the project uses ES Modules, run it using a local server.

Using Live Server:

* Install the **Live Server** extension in VS Code.
* Right-click on `index.html`.
* Select **Open with Live Server**.

Or use Python:

```bash
python -m http.server
```

Or Node.js:

```bash
npx serve .
```

---

## 📚 What I Learned

During this project I worked on:

* Graph traversal algorithms
* Data Structures (Queue, Stack, Priority Queue, Min Heap)
* DOM manipulation
* Modular JavaScript architecture
* Event handling
* Animation techniques
* Responsive design
* Accessibility
* Performance optimization

---

## 🔮 Future Improvements

* Bidirectional Search
* Jump Point Search (JPS)
* Diagonal movement
* Multiple checkpoints
* Custom heuristics
* Save and share board layouts
* Progressive Web App (PWA)
* Performance benchmarking

---

## 📄 License

This project is licensed under the **MIT License**.
