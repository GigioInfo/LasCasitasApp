# LasCasitasApp

Este repositorio contiene el prototipo del servicio digital para la cafetería
universitaria **Las Casitas**, desarrollado como parte de la Práctica 3 de la asignatura
*Sistemas de Información en la Organización* (ULPGC).

## Tecnologías usadas

- React (Create React App)
- JavaScript
- HTML/CSS
- GitHub y GitHub Desktop

## Estructura del proyecto

- `lascasitas-react/`: código fuente del prototipo en React
- `lascasitas-react/src/components/`: componentes de la interfaz (Menú, Footer, etc.)
- `lascasitas-react/src/images/`: imágenes de los productos del menú
- `lascasitas-react/screenshots/`: capturas de pantalla usadas en la memoria P3

## Funcionalidades del prototipo

- Visualización del menú del día con varios productos.
- Posibilidad de añadir productos a "Mi pedido".
- Cálculo automático del total del pedido.
- Sección de "Estado del pedido" donde se explica cómo funcionaría el sistema en una versión real.

## 🚀 Demo en línea (sin necesidad de instalar nada)

El prototipo puede probarse directamente aquí:

**https://gigioinfo.github.io/LasCasitasApp/**

## 📌 Integración con Supabase (Backend)

Para almacenar datos reales del prototipo, se ha implementado un backend usando Supabase, que ofrece:
- Base de datos PostgreSQL
- API REST automática
- Gestión de tablas y relaciones
- Almacenamiento seguro en la nube

Se han creado dos tablas:

### 🧑‍🎓 Tabla `usuarios`

| Campo      | Tipo        | Descripción                    |
|------------|-------------|--------------------------------|
| id         | bigint      | Identificador del usuario      |
| nombre     | text        | Nombre del usuario             |
| email      | text        | Correo electrónico             |
| tipo       | text        | Rol del usuario (estudiante/profesor) |
| creado_en  | timestamptz | Fecha de creación automática   |

### 🧾 Tabla `pedidos`

| Campo       | Tipo        | Descripción                                    |
|-------------|-------------|------------------------------------------------|
| id          | bigint      | Identificador del pedido                       |
| usuario_id  | bigint      | Relación con usuarios.id (FK)                  |
| total       | numeric     | Importe total del pedido                       |
| estado      | text        | Estado del pedido (ej. en_preparacion)         |
| contenido   | jsonb       | Lista de productos del pedido en formato JSON  |
| creado_en   | timestamptz | Fecha de creación automática                   |
---

## 🖥️ Cómo ejecutar el prototipo en local (opcional)

1. Clonar este repositorio.
2. Entrar en la carpeta `lascasitas-react`.
3. Instalar las dependencias con: 
```
npm install
```
4. Ejecutar el proyecto con:    
```
npm start
```
El prototipo se abrirá en `http://localhost:3000`.

## Autores
Trabajo realizado por el Grupo 9:
- Luigi Fedele
- Fedele Zuccaro
- Joan Martínez Perdomo
  
SIO ULPGC 2025/26
