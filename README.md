# 📍 Asignador de Zonas de Bilbao

Aplicación web progresiva (PWA) que procesa archivos Excel con listados de calles y les asigna automáticamente su zona de reparto en Bilbao.

![Version](https://img.shields.io/badge/versión-2.0-e63030) ![PWA](https://img.shields.io/badge/PWA-compatible-22c55e) ![License](https://img.shields.io/badge/licencia-privada-9a9590)

---

## ¿Qué hace?

1. Subes un Excel (`.xlsx` / `.xls`) con una columna `Calle`
2. La app cruza cada calle contra un diccionario de ~500 entradas
3. Devuelve el mismo Excel con una columna `Zona` añadida
4. Muestra estadísticas, calles no identificadas y una vista previa completa

---

## Funcionalidades

| Pestaña | Descripción |
|---|---|
| 📁 **Procesar Excel** | Sube o arrastra un Excel, procesa y descarga el resultado |
| ➕ **Nueva Calle** | Añade calles al diccionario desde la UI — se guardan en el navegador |
| 🔍 **Consultar** | Busca a qué zona pertenece cualquier calle |
| 📋 **Diccionario** | Visor completo de todas las entradas con filtros |

**Extras tras procesar:**
- Estadísticas de cobertura (total / identificadas / no encontradas / %)
- Desglose de resultados por zona
- Lista de calles no identificadas clicables → rellena el formulario automáticamente
- Vista previa paginada con búsqueda y filtros
- Exportar calles no identificadas a `.txt`

---

## Estructura del proyecto

```
/
├── index.html          ← Entrada de la app
├── manifest.json       ← Configuración PWA
├── sw.js               ← Service Worker (caché offline)
│
├── css/
│   └── styles.css      ← Estilos completos + responsive
│
├── js/
│   ├── data.js         ← Diccionario de calles (editar aquí)
│   └── app.js          ← Lógica de la aplicación
│
└── assets/
    ├── bilbo.jpg
    ├── images.png
    ├── icono192x192.png
    └── icono512x512.png
```

---

## Añadir calles al diccionario base

Abre `js/data.js`, localiza la zona con `Ctrl+F` y añade la entrada:

```js
// ─── DEUSTO ──────────────────
"NOMBRE DE LA CALLE": "Deusto",
```

La clave debe ir en **mayúsculas**. La búsqueda es por `.includes()`, así que puede ser una subcadena del nombre completo.

Alternativamente, usa la pestaña **➕ Nueva Calle** en la propia app — se guarda en `localStorage` sin tocar código.

---

## Despliegue

Es una app estática — no necesita servidor ni build. Basta con servir la carpeta raíz desde cualquier hosting estático:

```bash
# Desarrollo local
npx serve .

# O simplemente abre index.html en el navegador
```

**Recomendados para producción:** GitHub Pages, Netlify, Vercel, Firebase Hosting.

> ⚠️ El Service Worker requiere **HTTPS** en producción (en `localhost` funciona sin él).

---

## Actualizar la app (Service Worker)

Cada vez que publiques cambios, actualiza el número de versión en `sw.js`:

```js
const CACHE = 'zonas-bilbao-v6.1.0'; // ← incrementar en cada deploy
```

Esto fuerza a todos los usuarios a descargar la versión nueva en su próxima visita.

---

## Zonas disponibles

| Zona | Zona |
|---|---|
| Deusto | Deusto Muelle |
| Deusto Monte | San Ignacio |
| Matiko | Matiko Alto |
| Bilbao Centro | Bilbao-Basurtu |
| Bilbao Muelle | Kasko Viejo |
| Santutxu | Santutxu Alto |
| San Francisco | Miribilla |
| Zamakola | Zorroza |
| Zurbaranbarri | Rekalde |
| Txurdinaga | Txurdinaga - Alto |

---

## Dependencias externas

| Librería | Versión | Uso |
|---|---|---|
| [SheetJS](https://sheetjs.com/) | 0.19.3 | Leer y escribir archivos Excel |
| [Bebas Neue](https://fonts.google.com/specimen/Bebas+Neue) | — | Tipografía de títulos |
| [DM Sans](https://fonts.google.com/specimen/DM+Sans) | — | Tipografía de cuerpo |

No hay frameworks ni bundlers. Vanilla JS puro.

---

## Compatibilidad

- ✅ Chrome / Edge (recomendado)
- ✅ Firefox
- ✅ Safari / iOS
- ✅ Instalable como PWA en móvil y escritorio

---

© J.Costa 2026 — Todos los derechos reservados
