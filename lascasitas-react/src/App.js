import React, { useState, useEffect } from 'react';
import './App.css';
import Menu from './components/Menu';
import Footer from './components/Footer';
import { supabase } from './supabase';

function App() {

  const [pedidosPanel, setPedidosPanel] = useState([]);
  const [cargandoPanel, setCargandoPanel] = useState(false);

  const [estadoRemoto, setEstadoRemoto] = useState(null);
  const [cargandoEstado, setCargandoEstado] = useState(false);

  const [menuItems, setMenuItems] = useState([]);
  const [cargandoMenu, setCargandoMenu] = useState(true);

  const [ultimoPedidoId, setUltimoPedidoId] = useState(null);

  const [perfilUsuario, setPerfilUsuario] = useState(null);
  const [puntosUsuario, setPuntosUsuario] = useState(0);
  const [historialPedidos, setHistorialPedidos] = useState([]);
  const [cargandoPerfil, setCargandoPerfil] = useState(false);

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
    setPagina('estado');
    vaciarPedido();
  };

  const actualizarEstadoPedido = async () => {
    if (!ultimoPedidoId) return;
    setCargandoEstado(true);

    const { data, error } = await supabase
      .from('pedidos')
      .select('estado')
      .eq('id', ultimoPedidoId)
      .single();

    setCargandoEstado(false);

    if (error) {
      console.error('Error consultando estado del pedido:', error);
      return;
    }

    setEstadoRemoto(data.estado);
  };



  //cargar pedidos
  const cargarPedidosPanel = async () => {
    setCargandoPanel(true);

    const { data, error } = await supabase
      .from('pedidos')
      .select('id, total, estado')
      .order('id', { ascending: false });

    setCargandoPanel(false);

    if (error) {
      console.error('Error cargando pedidos para panel:', error);
      return;
    }

    setPedidosPanel(data);
  };

  //marcar listo
  const marcarPedidoListo = async (id) => {
    const { error } = await supabase
      .from('pedidos')
      .update({ estado: 'listo' })
      .eq('id', id);

    if (error) {
      console.error('Error marcando pedido como listo:', error);
      return;
    }

    cargarPedidosPanel();
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
        <button
          className={pagina === 'panel' ? 'nav-btn active' : 'nav-btn'}
          onClick={() => setPagina('panel')}
        >
          🧑‍🍳 Panel interno
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

            {!ultimoPedidoId && (
              <p>
                No hay ningún pedido reciente. Haz un pedido desde el menú y confírmalo para ver su estado aquí.
              </p>
            )}

            {ultimoPedidoId && (
              <>
                <p>Número de pedido: #{ultimoPedidoId}</p>
                <button onClick={actualizarEstadoPedido}>
                  Actualizar estado
                </button>

                {cargandoEstado && <p>Consultando estado...</p>}

                {estadoRemoto === 'en_preparacion' && (
                  <div className="estado-box">
                    El pedido está actualmente <strong>EN PREPARACIÓN</strong>.
                  </div>
                )}

                {estadoRemoto === 'listo' && (
                  <div className="estado-box listo">
                    El pedido está <strong>LISTO</strong> para recoger en barra.
                  </div>
                )}

                {!cargandoEstado && !estadoRemoto && (
                  <p>No se ha encontrado el estado del pedido.</p>
                )}
              </>
            )}
          </section>
        )}

        {pagina === 'panel' && (
          <section>
            <h2>Panel interno – Pedidos</h2>
            <button onClick={cargarPedidosPanel}>Actualizar lista</button>

            {cargandoPanel && <p>Cargando pedidos...</p>}

            {!cargandoPanel && pedidosPanel.length === 0 && (
              <p>No hay pedidos registrados.</p>
            )}

            {!cargandoPanel && pedidosPanel.length > 0 && (
              <ul className="lista-pedidos-panel">
                {pedidosPanel.map((p) => (
                  <li key={p.id}>
                    <div>
                      <strong>Pedido #{p.id}</strong> – {p.total.toFixed(2)} € – Estado: {p.estado}
                    </div>
                    {p.estado !== 'listo' && (
                      <button onClick={() => marcarPedidoListo(p.id)}>
                        Marcar como listo
                      </button>
                    )}
                  </li>
                ))}
              </ul>
            )}
          </section>
        )}
      </main>
      <Footer />
    </div>
  );
}

export default App;