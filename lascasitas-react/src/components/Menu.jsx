import React from 'react';

function Menu({ items, onAdd }) {
  return (
    <section>
      <h2>Menú del día</h2>
      <p>Selecciona los productos que quieres pedir.</p>
      <div className="lista-menu">
        {items.map((item) => (
          <div key={item.id} className="tarjeta-menu">
            {item.imagen && (
              <img
                src={item.imagen}
                alt={item.nombre}
                className="imagen-menu"
              />
            )}
            <h3>{item.nombre}</h3>
            <p>{item.precio.toFixed(2)} €</p>
            <button onClick={() => onAdd(item)}>
              Añadir al pedido
            </button>
          </div>
        ))}
      </div>
    </section>
  );
}

export default Menu;