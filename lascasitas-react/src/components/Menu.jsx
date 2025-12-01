import React from 'react';

function Menu({ items, onAdd, cargando }) {
  if (cargando) {
    return <p>Cargando menú…</p>;
  }

  if (!items || items.length === 0) {
    return <p>No hay productos disponibles.</p>;
  }

  return (
    <div className="menu">
      {items.map((item) => (
        <div key={item.id} className="menu-item">
          {item.imagen && <img src={item.imagen} alt={item.nombre} />}
          <h3>{item.nombre}</h3>
          <p>{item.precio.toFixed(2)} €</p>
          <button onClick={() => onAdd(item)}>
            Añadir
          </button>
        </div>
      ))}
    </div>
  );
}

export default Menu;