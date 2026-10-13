// languages.js — การตั้งค่าภาษาและโค้ดตัวอย่าง

const file = (name, language, content) => ({
  name,
  language, // ชื่อภาษาของ Monaco
  content: content.replace(/^\n/, ''),
})

/* ---------------- Templates ---------------- */

const WEB_HTML = String.raw`
<!DOCTYPE html>
<html lang="th">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>My Page</title>
  <link rel="stylesheet" href="style.css" />
</head>
<body>
  <main class="card">
    <h1>สวัสดี CODING STUDIO 👋</h1>
    <p>แก้ไข HTML, CSS, JS แล้วกด Run</p>
    <button id="btn">คลิกฉัน</button>
    <p id="count">คลิกไปแล้ว 0 ครั้ง</p>
  </main>
  <script src="script.js"></script>
</body>
</html>
`

const WEB_CSS = String.raw`
* { box-sizing: border-box; }

body {
  margin: 0;
  min-height: 100vh;
  display: grid;
  place-items: center;
  font-family: system-ui, sans-serif;
  background: linear-gradient(135deg, #0f172a, #134e4a);
  color: #e2e8f0;
}

.card {
  padding: 2rem 2.5rem;
  border-radius: 16px;
  background: rgba(15, 23, 42, 0.7);
  border: 1px solid rgba(52, 211, 153, 0.3);
  box-shadow: 0 20px 50px rgba(0, 0, 0, 0.4);
  text-align: center;
}

h1 { margin-top: 0; color: #34d399; }

button {
  padding: 0.6rem 1.4rem;
  border: none;
  border-radius: 8px;
  background: #10b981;
  color: white;
  font-weight: 600;
  cursor: pointer;
  transition: transform 0.1s, background 0.2s;
}
button:hover { background: #059669; }
button:active { transform: scale(0.96); }
`

const WEB_JS = String.raw`
let count = 0;
const btn = document.getElementById('btn');
const label = document.getElementById('count');

btn.addEventListener('click', () => {
  count++;
  label.textContent = 'คลิกไปแล้ว ' + count + ' ครั้ง';
  console.log('clicked:', count);
});

console.log('Page loaded!');
`

const JS_MAIN = String.raw`
// JavaScript — รันใน Web Worker (ไม่มี DOM)
function calculateSum(a, b) {
  return a + b;
}

const result = calculateSum(10, 5);
console.log("Result is:", result);

const users = [
  { name: "Ann", age: 21 },
  { name: "Bob", age: 25 },
];
console.log(users);
console.log("Names:", users.map((u) => u.name).join(", "));
`

const JSX_APP = String.raw`
import { useState, useEffect } from 'react';

export default function App() {
  const [count, setCount] = useState(0);

  useEffect(() => {
    console.log('count =', count);
  }, [count]);

  return (
    <div style={{ fontFamily: 'system-ui, sans-serif', padding: 32, textAlign: 'center' }}>
      <h1>Hello React ⚛️</h1>
      <p>แก้โค้ดแล้วกด Run เพื่อดูผลลัพธ์</p>
      <button
        onClick={() => setCount(count + 1)}
        style={{ padding: '8px 20px', fontSize: 16, borderRadius: 8, cursor: 'pointer' }}
      >
        Count: {count}
      </button>
    </div>
  );
}
`

const TSX_APP = String.raw`
import { useState } from 'react';

type Todo = { id: number; text: string; done: boolean };

export default function App() {
  const [todos, setTodos] = useState<Todo[]>([
    { id: 1, text: 'เรียน TypeScript', done: true },
    { id: 2, text: 'สร้างโปรเจกต์ React', done: false },
  ]);
  const [text, setText] = useState<string>('');

  const addTodo = () => {
    if (!text.trim()) return;
    setTodos([...todos, { id: Date.now(), text: text.trim(), done: false }]);
    setText('');
  };

  const toggle = (id: number) =>
    setTodos(todos.map((t) => (t.id === id ? { ...t, done: !t.done } : t)));

  return (
    <div style={{ fontFamily: 'system-ui, sans-serif', maxWidth: 420, margin: '40px auto' }}>
      <h1>📝 Todo (TSX)</h1>
      <div style={{ display: 'flex', gap: 8 }}>
        <input
          value={text}
          onChange={(e) => setText(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && addTodo()}
          placeholder="เพิ่มงาน..."
          style={{ flex: 1, padding: 8 }}
        />
        <button onClick={addTodo}>เพิ่ม</button>
      </div>
      <ul>
        {todos.map((t) => (
          <li
            key={t.id}
            onClick={() => toggle(t.id)}
            style={{ cursor: 'pointer', textDecoration: t.done ? 'line-through' : 'none' }}
          >
            {t.text}
          </li>
        ))}
      </ul>
    </div>
  );
}
`

const PY_MAIN = String.raw`
# ใส่ข้อมูลเข้า (stdin) ได้ที่แท็บ "Input" ด้านล่าง

def calculate_sum(a: int, b: int) -> int:
    return a + b

result = calculate_sum(10, 5)
print("Result is:", result)

squares = [n ** 2 for n in range(1, 6)]
print("Squares:", squares)

try:
    name = input()
except EOFError:
    name = "Coder"
print(f"Hello, {name}!")
`

const C_MAIN = String.raw`
#include <stdio.h>

int calculate_sum(int a, int b) {
    return a + b;
}

int main(void) {
    int result = calculate_sum(10, 5);
    printf("Result is: %d\n", result);

    for (int i = 1; i <= 3; i++) {
        printf("Loop #%d\n", i);
    }
    return 0;
}
`

const CPP_MAIN = String.raw`
#include <iostream>
#include <string>
#include <vector>
using namespace std;

int calculateSum(int a, int b) {
    return a + b;
}

int main() {
    cout << "Result is: " << calculateSum(10, 5) << endl;

    vector<string> langs = {"C++", "Python", "Java"};
    for (const auto& lang : langs) {
        cout << "Hello, " << lang << "!" << endl;
    }

    // อ่านค่าจากแท็บ Input (stdin)
    string name;
    if (!(cin >> name)) name = "Coder";
    cout << "Welcome, " << name << endl;
    return 0;
}
`

const CS_MAIN = String.raw`
using System;
using System.Linq;

class Program
{
    static int CalculateSum(int a, int b) => a + b;

    static void Main()
    {
        int result = CalculateSum(10, 5);
        Console.WriteLine("Result is: " + result);

        var evens = Enumerable.Range(1, 10).Where(n => n % 2 == 0);
        Console.WriteLine("Evens: " + string.Join(", ", evens));
    }
}
`

const JAVA_MAIN = String.raw`
import java.util.*;

public class Main {
    static int calculateSum(int a, int b) {
        return a + b;
    }

    public static void main(String[] args) {
        System.out.println("Result is: " + calculateSum(10, 5));

        List<String> langs = List.of("Java", "Python", "C++");
        for (String lang : langs) {
            System.out.println("Hello, " + lang + "!");
        }
    }
}
`

/* ---------------- Language config ---------------- */
// runner: web | js | react | python | piston

export const LANGUAGES = {
  web: {
    id: 'web', label: 'HTML / CSS / JS', short: 'WEB', color: '#f06529',
    runner: 'web', entry: 'index.html', tabSize: 2, stdin: false,
    template: () => [
      file('index.html', 'html', WEB_HTML),
      file('style.css', 'css', WEB_CSS),
      file('script.js', 'javascript', WEB_JS),
    ],
  },
  javascript: {
    id: 'javascript', label: 'JavaScript', short: 'JS', color: '#f7df1e',
    runner: 'js', entry: 'main.js', tabSize: 2, stdin: false,
    template: () => [file('main.js', 'javascript', JS_MAIN)],
  },
  jsx: {
    id: 'jsx', label: 'React (JSX)', short: 'JSX', color: '#61dafb',
    runner: 'react', entry: 'App.jsx', tabSize: 2, stdin: false,
    template: () => [file('App.jsx', 'javascript', JSX_APP)],
  },
  tsx: {
    id: 'tsx', label: 'React (TSX)', short: 'TSX', color: '#4f9fe8',
    runner: 'react', entry: 'App.tsx', tabSize: 2, stdin: false,
    template: () => [file('App.tsx', 'typescript', TSX_APP)],
  },
  python: {
    id: 'python', label: 'Python', short: 'PY', color: '#ffd43b',
    runner: 'python', entry: 'main.py', tabSize: 4, stdin: true,
    template: () => [file('main.py', 'python', PY_MAIN)],
  },
  c: {
    id: 'c', label: 'C', short: 'C', color: '#a8b9cc',
    runner: 'piston', piston: 'c', entry: 'main.c', tabSize: 4, stdin: true,
    template: () => [file('main.c', 'c', C_MAIN)],
  },
  cpp: {
    id: 'cpp', label: 'C++', short: 'C++', color: '#659ad2',
    runner: 'piston', piston: 'c++', entry: 'main.cpp', tabSize: 4, stdin: true,
    template: () => [file('main.cpp', 'cpp', CPP_MAIN)],
  },
  csharp: {
    id: 'csharp', label: 'C#', short: 'C#', color: '#b77fdb',
    runner: 'piston', piston: 'csharp', entry: 'Program.cs', tabSize: 4, stdin: true,
    template: () => [file('Program.cs', 'csharp', CS_MAIN)],
  },
  java: {
    id: 'java', label: 'Java', short: 'JAVA', color: '#f89820',
    runner: 'piston', piston: 'java', entry: 'Main.java', tabSize: 4, stdin: true,
    template: () => [file('Main.java', 'java', JAVA_MAIN)],
  },
}

export const LANGUAGE_ORDER = ['web', 'javascript', 'jsx', 'tsx', 'python', 'c', 'cpp', 'csharp', 'java']

export const createProject = (id) => ({
  files: LANGUAGES[id].template(),
  active: LANGUAGES[id].entry,
  stdin: '',
})

export const createAllProjects = () =>
  Object.fromEntries(LANGUAGE_ORDER.map((id) => [id, createProject(id)]))

const FILE_BADGES = {
  html: { label: 'HTML', color: '#f06529' },
  css: { label: 'CSS', color: '#2ea9e5' },
  js: { label: 'JS', color: '#f7df1e' },
  jsx: { label: 'JSX', color: '#61dafb' },
  tsx: { label: 'TSX', color: '#4f9fe8' },
  py: { label: 'PY', color: '#ffd43b' },
  c: { label: 'C', color: '#a8b9cc' },
  cpp: { label: 'C++', color: '#659ad2' },
  cs: { label: 'C#', color: '#b77fdb' },
  java: { label: 'JAVA', color: '#f89820' },
}

export const getFileBadge = (name) =>
  FILE_BADGES[name.split('.').pop().toLowerCase()] ?? { label: 'FILE', color: '#8b949e' }