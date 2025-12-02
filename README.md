# LasCasitasApp – Prototipo completo del sistema digital de la cafetería universitaria

Este repositorio contiene el prototipo funcional del sistema digital **LasCasitasApp**, desarrollado como parte de la Práctica 3 de la asignatura  
**Sistemas de Información en la Organización (ULPGC)**.

Incluye:

✔ Aplicación web interactiva en **React**  
✔ Backend en **Supabase** con autenticación, base de datos y triggers  
✔ Panel interno para personal  
✔ Gestión real de menú, pedidos, pagos simulados y reservas de mesa

---

## 🌐 Demo en línea  
Disponible sin instalar nada:

👉 **https://gigioinfo.github.io/LasCasitasApp/**

---

# 🚀 Funcionalidades principales

## 🧑‍🍳 Para clientes
- Registro e inicio de sesión con sistema seguro (Supabase Auth).
- Menú actualizado dinámicamente desde base de datos.
- Posibilidad de añadir productos al pedido y confirmar la compra.
- Métodos de pago simulados:
  - Pago en caja (efectivo/tarjeta)
  - Monedero digital ULPGC (solo miembros ULPGC)
- Acumulación automática de puntos de fidelidad.
- Historial completo de pedidos ordenado por estado.
- Alertas de “pedido listo”.
- Reserva de mesas con verificación de aforo en tiempo real.
- Vista de **reservas futuras** del usuario.

---

## 🧑‍🍽️ Panel interno (personal)
Roles soportados:

### 👨‍🍳 Cocinero
- Ver todos los pedidos en preparación.
- Marcar pedidos como *“listo”*.
- Gestionar menú: añadir productos, ocultarlos o mostrarlos.

### 🧑‍💼 Staff
- Ver pedidos listos.
- Marcar pedidos como *“recogido”*.
- Panel de estadísticas:
  - Ventas totales  
  - Número de pedidos  
  - Producto más pedido  
- Ver **reservas del día**.

Cada rol ve solo lo correspondiente a su función.

---

# 🗄️ Backend – Arquitectura en Supabase

El sistema está soportado por:

- PostgreSQL con RLS activado  
- Autenticación de usuarios  
- Triggers automáticos para crear perfiles  
- API REST segura  
- Policies de acceso por rol  
- Almacenamiento integrado para imágenes  

---

## 📦 Tablas principales

### 🧑‍🎓 **usuarios**

| Campo                 | Tipo        | Descripción |
|----------------------|-------------|-------------|
| id                   | bigint PK   | Identificador |
| auth_id              | uuid        | ID interno de Supabase Auth |
| nombre               | text        | Nombre del usuario |
| email                | text        | Correo electrónico |
| tipo                 | text        | cliente / staff / cocinero |
| miembro_ulpgc        | boolean     | Es estudiante/profesor |
| metodo_pago_preferido| text        | Método por defecto |
| creado_en            | timestamptz | Fecha de creación |

---

### 🍔 **productos**

| Campo            | Tipo | Descripción |
|------------------|------|-------------|
| id               | bigint |
| nombre           | text |
| precio           | numeric |
| imagen_url       | text |
| categoria_id     | int |
| visible_cliente  | boolean |

---

### 🧾 **pedidos**

| Campo       | Tipo        | Descripción |
|-------------|-------------|-------------|
| id          | bigint      |
| usuario_id  | bigint      |
| total       | numeric     |
| estado      | text        |
| creado_en   | timestamptz |

---

### 📦 **lineas_pedido**
- pedido_id  
- producto_id  
- cantidad  
- precio_unitario  

---

### 💳 **pagos**
- pedido_id  
- metodo  
- importe  
- fecha_pago  
- estado  

---

### ⭐ **puntos_usuarios**
- usuario_id  
- puntos  

---

### 📅 **reservas**

| Campo           | Tipo          |
|-----------------|---------------|
| usuario_id      | bigint        |
| inicio          | timestamptz   |
| fin             | timestamptz   |
| num_personas    | int           |
| estado          | text          |
| nombre_contacto | text          |
| email_contacto  | text          |

---

### ⚙️ **config_local**
- aforo_total

---

# 🛠️ Tecnologías usadas

### Frontend
- React (Create React App)
- JavaScript ES6+
- HTML5 + CSS3

### Backend
- Supabase (PostgreSQL + API REST + Auth)
- RLS + Policies
- Triggers automáticos

### Otros
- GitHub Pages (deploy)
- GitHub Desktop

---

# 📁 Estructura del proyecto
lascasitas-react/
│── src/
│   ├── components/
│   ├── images/
│   ├── App.js
│   ├── supabase.js
│── public/
│── screenshots/

---

# ▶️ Cómo ejecutar en local

1. Clonar este repositorio  
2. Entrar en `lascasitas-react`  
3. Instalar dependencias:
```
npm install
```
4. Ejecutar:
```
npm start
```

Disponible en:

http://localhost:3000

---

# 👥 Autores

Proyecto desarrollado por el **Grupo 9**:

- **Luigi Fedele**  
- **Fedele Zuccaro**  
- **Joan Martínez Perdomo**

SIO – Universidad de Las Palmas de Gran Canaria  
Curso **2025/26**



















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
