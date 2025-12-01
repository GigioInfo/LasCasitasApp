import React from 'react';

function Menu({ items, onAdd, cargando }) {
  if (cargando) {
    return <p>Cargando menú…</p>;
  }

  if (!items || items.length === 0) {
    return <p>No hay productos disponibles.</p>;
  }

  return (
    <div className="menu-grid">
      {items.map((item) => (
        <div key={item.id} className="menu-card">
          {item.imagen && (
            <img className="menu-img" src={item.imagen} alt={item.nombre} />
          )}
          <h3 className="menu-title">{item.nombre}</h3>
          <p className="menu-price">{item.precio.toFixed(2)} €</p>
          <button className="menu-btn" onClick={() => onAdd(item)}>
            Añadir
          </button>
        </div>
      ))}
    </div>
  );
}

export default Menu;