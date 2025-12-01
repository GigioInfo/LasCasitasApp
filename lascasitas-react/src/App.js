import React, { useState, useEffect } from 'react';
import './App.css';
import Menu from './components/Menu';
import Footer from './components/Footer';
import { supabase } from './supabase';

function App() {
  const [menuItems, setMenuItems] = useState([]);
  const [cargandoMenu, setCargandoMenu] = useState(true);

  const [ultimoPedidoId, setUltimoPedidoId] = useState(null);

  useEffect(() => {
    const cargarMenu = async () => {
      try {
        const { data, error } = await supabase
          .from('productos') // o 'menu_items' si la tabla se llama así
          .select('id, nombre, precio, categoria_id, imagen_url');

        if (error) {
          console.error('Error cargando menú:', error);
          return;
        }

        const itemsAdaptados = data.map((row) => ({
          id: row.id,
          nombre: row.nombre,
          precio: Number(row.precio),
          imagen: row.imagen_url || null,
          categoria_id: row.categoria_id,
        }));

        setMenuItems(itemsAdaptados);
        setCargandoMenu(false);
      } catch (e) {
        console.error('Error general cargando menú:', e);
      }
    };

    cargarMenu();
  }, []);

  const [pagina, setPagina] = useState('menu');
  const [pedido, setPedido] = useState([]);

  const añadirAlPedido = (item) => {
    setPedido([...pedido, item]);
  };

  const totalBruto = pedido.reduce(
    (suma, item) => suma + Number(item.precio),
    0
  );

  const total = Math.round(totalBruto * 100) / 100;

  const vaciarPedido = () => setPedido([]);

  const [estadoPedido, setEstadoPedido] = useState('sin_pedido');
  const totalFormatted = total.toFixed(2);

  const USUARIO_DEMO = {
    nombre: 'Alumno demo',
    email: 'demo@ulpgc.es',
    tipo: 'estudiante',
  };

  async function guardarPedidoEnSupabase(pedido, total) {
    try {
      // 1. Upsert usuario demo
      const { data: usuario, error: userError } = await supabase
        .from('usuarios')
        .upsert(USUARIO_DEMO)
        .select()
        .single();

      if (userError) throw userError;

      // 2. Crear pedido (solo columnas que EXISTEN en la tabla 'pedidos')
      const { data: nuevoPedido, error: pedidoError } = await supabase
        .from('pedidos')
        .insert({
          usuario_id: usuario.id,
          total: total,
          estado: 'en_preparacion',
          // opcional: también guardamos el contenido en JSON si tienes esta columna
          contenido: pedido,
        })
        .select()
        .single();

      if (pedidoError) throw pedidoError;

      // 3. Insertar líneas en la tabla correcta: 'lineas_pedido'
      const lineas = pedido.map((item) => ({
        pedido_id: nuevoPedido.id,
        producto_id: item.id,
        cantidad: 1,
        precio_unitario: item.precio,
      }));

      const { error: lineasError } = await supabase
        .from('lineas_pedido')   // ← NOMBRE REAL DE LA TABLA
        .insert(lineas);

      if (lineasError) throw lineasError;

      // 4. Registrar pago simulado (usa las columnas de tu tabla 'pagos')
      const { error: pagoError } = await supabase.from('pagos').insert({
        pedido_id: nuevoPedido.id,
        metodo: 'tarjeta',
        importe: total,
        fecha_pago: new Date().toISOString(),
        estado: 'confirmado',
      });

      if (pagoError) throw pagoError;

      console.log('Pedido, líneas y pago guardados correctamente');

      return nuevoPedido.id;
    } catch (e) {
      console.error('Error guardando pedido en Supabase:', e);
      return null;
    }
  }

  const confirmarPedido = async () => {
    if (pedido.length === 0) return;

    const idPedido = await guardarPedidoEnSupabase(pedido, total);
    if (!idPedido) return;

    setUltimoPedidoId(idPedido);
    setEstadoPedido('en_preparacion');
    setPagina('estado'); // opzionale: vai direttamente alla pagina stato
    vaciarPedido();
  };

  return (
    <div className="app">
      <header className="header">
        <h1>LasCasitasApp</h1>
        <p>Cafetería universitaria Las Casitas – Prototipo</p>
      </header>

      <nav className="nav">
        <button
          className={pagina === 'menu' ? 'nav-btn active' : 'nav-btn'}
          onClick={() => setPagina('menu')}
        >
          🍽️ Menú
        </button>
        <button
          className={pagina === 'pedido' ? 'nav-btn active' : 'nav-btn'}
          onClick={() => setPagina('pedido')}
        >
          🧾 Mi pedido ({pedido.length}) – {totalFormatted} €
        </button>
        <button
          className={pagina === 'estado' ? 'nav-btn active' : 'nav-btn'}
          onClick={() => setPagina('estado')}
        >
          📦 Estado del pedido
        </button>
      </nav>

      <main className="contenido">
        {pagina === 'menu' && (
          <Menu
            items={menuItems}
            cargando={cargandoMenu}
            onAdd={añadirAlPedido}
          />
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
                {pedido.length > 0 && (
                  <button
                    style={{ marginLeft: '0.5rem' }}
                    onClick={confirmarPedido}
                  >
                    Confirmar pedido
                  </button>
                )}
              </>
            )}
          </section>
        )}

        {pagina === 'estado' && (
          <section>
            <h2>Estado del pedido</h2>
            {estadoPedido === 'sin_pedido' && (
              <p>
                No hay ningún pedido en preparación. Primero añade productos en el
                menú y confirma el pedido en la sección "Mi pedido" durante la presentación.
              </p>
            )}
            {estadoPedido === 'en_preparacion' && (
              <div className="estado-box">
                El pedido está actualmente <strong>EN PREPARACIÓN</strong>.
                En una versión real, la cafetería actualizaría este estado cuando estuviera listo para recoger.
              </div>
            )}
          </section>
        )}
      </main>
      <Footer />
    </div>
  );
}

export default App;