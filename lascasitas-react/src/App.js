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

  const [authUser, setAuthUser] = useState(null);
  const [authLoading, setAuthLoading] = useState(true);
  const [authError, setAuthError] = useState(null);

  const [loginEmail, setLoginEmail] = useState('');
  const [loginPassword, setLoginPassword] = useState('');

  const [statsPanel, setStatsPanel] = useState({
    totalVentas: 0,
    numPedidos: 0,
    productoTopNombre: null,
  });

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

  useEffect(() => {
    const checkSession = async () => {
      const { data, error } = await supabase.auth.getUser();

      if (!error && data?.user) {
        setAuthUser(data.user);   // utente autenticato
      }

      setAuthLoading(false);
    };

    checkSession();

    // Listener per cambi di sessione (login / logout)
    const { data: subscription } = supabase.auth.onAuthStateChange(
      (_event, session) => {
        setAuthUser(session?.user ?? null);
      }
    );

    return () => {
      subscription.subscription.unsubscribe();
    };
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

  const totalFormatted = total.toFixed(2);

  const USUARIO_DEMO = {
    nombre: 'Alumno demo',
    email: 'demo@ulpgc.es',
    tipo: 'estudiante',
  };

  async function guardarPedidoEnSupabase(pedido, total) {
    try {
      let usuario;

      // 1. Se c'è un utente autenticato, usiamo auth_id
      if (authUser) {
        const { data, error } = await supabase
          .from('usuarios')
          .select('id, nombre, email, tipo')
          .eq('auth_id', authUser.id)
          .single();

        if (error) {
          console.error('No se ha encontrado perfil para el usuario autenticado:', error);
          return null;
        }

        usuario = data;
      } else {
        // 2. Fallback: utente demo (come prima)
        const { data: usuarios, error: userError } = await supabase
          .from('usuarios')
          .select('id, nombre, email, tipo, auth_id')
          .eq('email', USUARIO_DEMO.email)
          .order('id', { ascending: false })
          .limit(1);

        if (userError || !usuarios || usuarios.length === 0) {
          console.error('No se ha encontrado el usuario demo en usuarios:', userError);
          return null;
        }

        usuario = usuarios[0];
      }

      // 3. Crear pedido
      const { data: nuevoPedido, error: pedidoError } = await supabase
        .from('pedidos')
        .insert({
          usuario_id: usuario.id,
          total: total,
          estado: 'en_preparacion',
          contenido: pedido,
        })
        .select()
        .single();

      if (pedidoError) throw pedidoError;

      // 4. Insertar líneas
      const lineas = pedido.map((item) => ({
        pedido_id: nuevoPedido.id,
        producto_id: item.id,
        cantidad: 1,
        precio_unitario: item.precio,
      }));

      const { error: lineasError } = await supabase
        .from('lineas_pedido')
        .insert(lineas);

      if (lineasError) throw lineasError;

      // 5. Registrar pago simulado
      const { error: pagoError } = await supabase.from('pagos').insert({
        pedido_id: nuevoPedido.id,
        metodo: 'tarjeta',
        importe: total,
        fecha_pago: new Date().toISOString(),
        estado: 'confirmado',
      });

      if (pagoError) throw pagoError;

      // 6. Puntos (1 cada 2 €)
      const puntosGanados = Math.floor(Number(total) / 2);

      if (puntosGanados > 0) {
        let puntosPrevios = 0;

        const { data: filaPuntos, error: puntosSelectError } = await supabase
          .from('puntos_usuarios')
          .select('puntos')
          .eq('usuario_id', usuario.id)
          .maybeSingle();

        if (!puntosSelectError && filaPuntos) {
          puntosPrevios = Number(filaPuntos.puntos) || 0;
        }

        const { error: puntosUpsertError } = await supabase
          .from('puntos_usuarios')
          .upsert({
            usuario_id: usuario.id,
            puntos: puntosPrevios + puntosGanados,
          });

        if (puntosUpsertError) throw puntosUpsertError;
      }

      console.log('Pedido, líneas, pago y puntos guardados correctamente');
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
    setEstadoRemoto('en_preparacion'); 
    setCargandoEstado(false); 

  

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





  const cargarEstadisticasPanel = async () => {
    try {
      const { data: pedidos, error: pedidosError } = await supabase
        .from('pedidos')
        .select('id, total');

      if (pedidosError) {
        console.error('Error cargando pedidos para estadísticas:', pedidosError);
        return;
      }

      const totalVentas = pedidos.reduce(
        (suma, p) => suma + Number(p.total),
        0
      );
      const numPedidos = pedidos.length;

      const { data: lineas, error: lineasError } = await supabase
        .from('lineas_pedido')
        .select('producto_id, cantidad');

      if (lineasError) {
        console.error('Error cargando líneas de pedido para estadísticas:', lineasError);
        setStatsPanel({
          totalVentas,
          numPedidos,
          productoTopNombre: null,
        });
        return;
      }

      const contador = {};
      lineas.forEach((l) => {
        const qty = Number(l.cantidad) || 0;
        contador[l.producto_id] = (contador[l.producto_id] || 0) + qty;
      });

      let productoTopId = null;
      let maxCantidad = 0;
      Object.entries(contador).forEach(([id, qty]) => {
        if (qty > maxCantidad) {
          maxCantidad = qty;
          productoTopId = Number(id);
        }
      });

      let productoTopNombre = null;

      if (productoTopId !== null) {
        const { data: producto, error: prodError } = await supabase
          .from('productos')
          .select('nombre')
          .eq('id', productoTopId)
          .single();

        if (!prodError && producto) {
          productoTopNombre = producto.nombre;
        }
      }

      setStatsPanel({
        totalVentas,
        numPedidos,
        productoTopNombre,
      });
    } catch (e) {
      console.error('Error general calculando estadísticas del panel:', e);
    }
  };






  const cargarPerfilUsuario = async () => {
    if (!authUser) {
      setPerfilUsuario(null);
      setPuntosUsuario(0);
      setHistorialPedidos([]);
      return;
    }

    setCargandoPerfil(true);
    try {
      // 1. Buscar perfil en 'usuarios' por auth_id
      const { data: usuario, error: userError } = await supabase
        .from('usuarios')
        .select('id, nombre, email, tipo')
        .eq('auth_id', authUser.id)
        .single();

      if (userError) {
        throw userError;
      }

      setPerfilUsuario(usuario);

      // 2. Leer puntos de puntos_usuarios
      let puntos = 0;
      const { data: filaPuntos, error: puntosError } = await supabase
        .from('puntos_usuarios')
        .select('puntos')
        .eq('usuario_id', usuario.id)
        .maybeSingle();

      if (!puntosError && filaPuntos) {
        puntos = Number(filaPuntos.puntos) || 0;
      }

      setPuntosUsuario(puntos);

      // 3. Historial de pedidos
      const { data: pedidosUsuario, error: pedidosError } = await supabase
        .from('pedidos')
        .select('id, total, estado')
        .eq('usuario_id', usuario.id)
        .order('id', { ascending: false });

      if (!pedidosError && pedidosUsuario) {
        setHistorialPedidos(pedidosUsuario);
      }
    } catch (e) {
      console.error('Error cargando perfil de usuario:', e);
      setPerfilUsuario(null);
      setPuntosUsuario(0);
      setHistorialPedidos([]);
    }
    setCargandoPerfil(false);
  };



  const handleLogin = async (e) => {
    e.preventDefault();
    setAuthError(null);

    const { error } = await supabase.auth.signInWithPassword({
      email: loginEmail,
      password: loginPassword,
    });

    if (error) {
      console.error('Error en login:', error);
      setAuthError(error.message);
      return;
    }


  };

  const handleLogout = async () => {
    await supabase.auth.signOut();
    setAuthUser(null);
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
        <button
          className={pagina === 'perfil' ? 'nav-btn active' : 'nav-btn'}
          onClick={() => {
            setPagina('perfil');
            cargarPerfilUsuario();
          }}
        >
          👤 Mi perfil
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

            <button
              onClick={() => {
                cargarPedidosPanel();
                cargarEstadisticasPanel();
              }}
            >
              Actualizar lista
            </button>

            {cargandoPanel && <p>Cargando pedidos...</p>}

            {!cargandoPanel && pedidosPanel.length === 0 && (
              <p>No hay pedidos registrados.</p>
            )}

            <div className="panel-dashboard">
              <h3>Resumen de ventas</h3>
              <p>Ventas totales registradas: {statsPanel.totalVentas.toFixed(2)} €</p>
              <p>Número de pedidos: {statsPanel.numPedidos}</p>
              {statsPanel.productoTopNombre && (
                <p>Producto más pedido: {statsPanel.productoTopNombre}</p>
              )}
            </div>

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

        {pagina === 'perfil' && (
          <section>
            <h2>Mi perfil</h2>

            {authLoading && <p>Comprobando sesión...</p>}

            {/* Se NON hay usuario logueado → formulario de login */}
            {!authLoading && !authUser && (
              <div className="login-card">
                <h3 className="login-title">Inicia sesión para ver tu perfil</h3>
                <p className="login-subtitle">
                  Usa tus credenciales de Las Casitas para consultar puntos y pedidos.
                </p>

                <form onSubmit={handleLogin} className="login-form">
                  <div className="login-field">
                    <label>Correo electrónico</label>
                    <input
                      type="email"
                      value={loginEmail}
                      onChange={(e) => setLoginEmail(e.target.value)}
                      placeholder="ejemplo@ulpgc.es"
                      required
                    />
                  </div>

                  <div className="login-field">
                    <label>Contraseña</label>
                    <input
                      type="password"
                      value={loginPassword}
                      onChange={(e) => setLoginPassword(e.target.value)}
                      placeholder="Introduce tu contraseña"
                      required
                    />
                  </div>

                  <button type="submit" className="btn-primary">
                    Iniciar sesión
                  </button>

                  {authError && <p className="error-text">{authError}</p>}
                </form>
              </div>
            )}

            {/* Si HAY usuario logueado → mostramos perfil y puntos */}
            {authUser && !cargandoPerfil && perfilUsuario && (
              <div className="perfil-card">
                <div className="perfil-header">
                  <div>
                    <h3 className="perfil-nombre">
                      {perfilUsuario.nombre || 'Usuario'}
                    </h3>
                    <p className="perfil-email">
                      {perfilUsuario.email || authUser.email}
                    </p>
                  </div>
                  <span className="perfil-badge">Sesión iniciada</span>
                </div>

                <div className="perfil-meta">
                  <p>
                    <strong>Tipo:</strong>{' '}
                    {perfilUsuario.tipo || 'estudiante'}
                  </p>
                  <p>
                    <strong>Puntos acumulados:</strong> {puntosUsuario}
                  </p>
                </div>

                <div className="perfil-actions">
                  <button className="btn-secondary" onClick={handleLogout}>
                    Cerrar sesión
                  </button>
                </div>

                {historialPedidos && historialPedidos.length > 0 && (
                  <>
                    <h3 className="perfil-historial-titulo">
                      Historial de pedidos
                    </h3>
                    <ul className="lista-historial">
                      {historialPedidos.map((pedido) => (
                        <li key={pedido.id}>
                          <div>
                            <strong>Pedido #{pedido.id}</strong> –{' '}
                            {pedido.total.toFixed(2)} €
                          </div>
                          <div>
                            <small>
                              {/* usa el nombre de columna correcto de tu tabla,
                                por ejemplo 'creado_en' */}
                              {pedido.creado_en &&
                                new Date(pedido.creado_en).toLocaleString()}{' '}
                              • {pedido.estado}
                            </small>
                          </div>
                        </li>
                      ))}
                    </ul>
                  </>
                )}
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