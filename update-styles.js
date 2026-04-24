const fs = require('fs');

let css = fs.readFileSync('src/styles.css', 'utf8');

css = css.replace(/\.app-shell \{[\s\S]*?\}/, `.app-shell {
  width: 100%;
  height: 100%;
  display: grid;
  grid-template-columns: 280px 1fr 340px;
  grid-template-rows: 54px 1fr;
  grid-template-areas:
    "header header header"
    "left main right";
  background: #000;
  color: #fff;
  overflow: hidden;
}`);

css += `
.header-bar { 
  grid-area: header; 
  display: flex; 
  align-items: center; 
  padding: 0 16px; 
  border-bottom: 1px solid var(--border); 
  justify-content: space-between;
  background: #0a0a0a;
}
.left-panel { grid-area: left; border-right: 1px solid var(--border); padding: 12px; overflow-y: auto; background: #050505; }
.right-panel { grid-area: right; border-left: 1px solid var(--border); padding: 12px; overflow-y: auto; background: #050505; }
.stage { grid-area: main; background: #000; border: none; }

.param-row {
  display: flex;
  flex-direction: column;
  margin-bottom: 8px;
}
.param-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 4px;
}
.param-label {
  color: #aaa;
  font-size: 0.65rem;
  text-transform: uppercase;
  letter-spacing: 0.5px;
}
.param-val {
  color: #fff;
  font-size: 0.65rem;
  background: #222;
  padding: 2px 6px;
  border-radius: 2px;
  font-variant-numeric: tabular-nums;
  cursor: default;
}

.layer-item {
  border: 1px solid #333;
  margin-bottom: 8px;
  background: #111;
  border-radius: 4px;
  overflow: hidden;
}
.layer-item.active {
  border-color: #3b82f6;
  box-shadow: 0 0 8px rgba(59, 130, 246, 0.2);
}
.layer-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 8px;
  background: #1a1a1a;
  cursor: pointer;
}
.layer-title {
  font-size: 0.75rem;
  font-weight: bold;
  text-transform: uppercase;
}
.layer-body {
  padding: 8px;
  border-top: 1px solid #333;
}

.acc-header {
  background: #1a1a1a;
  padding: 6px 12px;
  font-size: 0.7rem;
  font-weight: bold;
  text-transform: uppercase;
  cursor: pointer;
  border: 1px solid #333;
  color: #ddd;
  margin-top: 8px;
  display: flex;
  justify-content: space-between;
}
.acc-header:hover {
  background: #222;
  color: #fff;
}
.acc-body {
  border: 1px solid #333;
  border-top: none;
  padding: 12px;
  background: #0a0a0a;
}
`;

fs.writeFileSync('src/styles.css', css);
