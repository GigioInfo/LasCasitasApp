import React, { useState } from 'react';
import './App.css';
import cafeImg from './images/cafe.jpg';
import bocadilloImg from './images/bocadillo.jpg';
import chapataImg from './images/chapata.jpg';
import zumoImg from './images/zumo.jpg';
import tartaImg from './images/tarta.jpg';
import Menu from './components/Menu';
import Footer from './components/Footer';

// Menú de ejemplo (luego lo podéis cambiar)
const MENU_ITEMS = [
  { id: 1, nombre: 'Café con leche', precio: 1.20, imagen: cafeImg },
  { id: 2, nombre: 'Bocadillo de jamón', precio: 2.80, imagen: bocadilloImg },
  { id: 3, nombre: 'Chapata de pollo', precio: 3.20, imagen: chapataImg },
  { id: 4, nombre: 'Zumo de naranja', precio: 1.50, imagen: zumoImg },
  { id: 5, nombre: 'Tarta de chocolate', precio: 2.50, imagen: tartaImg },
];

function App() {
  const [pagina, setPagina] = useState('menu');     // 'menu' | 'pedido' | 'estado'
  const [pedido, setPedido] = useState([]);         // productos añadidos

  const añadirAlPedido = (item) => {
    setPedido([...pedido, item]);
  };

  const total = pedido.reduce((suma, item) => suma + item.precio, 0);

  const vaciarPedido = () => {
    setPedido([]);
  };

  return (
    <div className="app">
      <header className="header">
        <h1>LasCasitasApp</h1>
        <p>Cafetería universitaria Las Casitas – Prototipo</p>
      </header>

      {/* NAVBAR SEMPLICE */}
      <nav className="nav">
        <button
          className={pagina === 'menu' ? 'nav-btn active' : 'nav-btn'}
          onClick={() => setPagina('menu')}
        >
          Menú
        </button>
        <button
          className={pagina === 'pedido' ? 'nav-btn active' : 'nav-btn'}
          onClick={() => setPagina('pedido')}
        >
          Mi pedido ({pedido.length})
        </button>
        <button
          className={pagina === 'estado' ? 'nav-btn active' : 'nav-btn'}
          onClick={() => setPagina('estado')}
        >
          Estado del pedido
        </button>
      </nav>

      <main className="contenido">
        {pagina === 'menu' && (
          <Menu items={MENU_ITEMS} onAdd={añadirAlPedido} />
        )}
        {pagina === 'pedido' && (
          <section>
            <h2>Mi pedido</h2>
            {pedido.length === 0 ? (
              <p>No has añadido nada todavía.</p>
            ) : (
              <>
                <ul className="lista-pedido">
                  {pedido.map((item, index) => (
                    <li key={index}>
                      {item.nombre} – {item.precio.toFixed(2)} €
                    </li>
                  ))}
                </ul>
                <p className="total">
                  Total: <strong>{total.toFixed(2)} €</strong>
                </p>
                <button onClick={vaciarPedido}>Vaciar pedido</button>
              </>
            )}
          </section>
        )}

        {pagina === 'estado' && (
          <section>
            <h2>Estado del pedido</h2>
            {pedido.length === 0 ? (
              <p>
                No hay ningún pedido en preparación. Añade productos en el menú
                y confirma el pedido durante la presentación.
              </p>
            ) : (
              <p>
                Este es un prototipo: durante la demo podéis explicar que el
                pedido está "EN PREPARACIÓN" y simular la notificación cuando
                esté listo.
              </p>
            )}
          </section>
        )}
      </main>
      <Footer />
    </div>
  );
}

export default App;