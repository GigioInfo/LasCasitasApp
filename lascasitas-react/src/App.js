import React, { useState, useEffect, useCallback } from 'react';
import './App.css';
import Menu from './components/Menu';
import Footer from './components/Footer';
import { supabase } from './supabase';

function App() {

  const [pedidosPanel, setPedidosPanel] = useState([]);
  const [cargandoPanel, setCargandoPanel] = useState(false);

  const [menuItems, setMenuItems] = useState([]);
  const [cargandoMenu, setCargandoMenu] = useState(true);

  const [perfilUsuario, setPerfilUsuario] = useState(null);
  const [puntosUsuario, setPuntosUsuario] = useState(0);
  const [historialPedidos, setHistorialPedidos] = useState([]);
  const [cargandoPerfil, setCargandoPerfil] = useState(false);

  const [authUser, setAuthUser] = useState(null);
  const [authLoading, setAuthLoading] = useState(true);
  const [authError, setAuthError] = useState(null);

  const [loginEmail, setLoginEmail] = useState('');
  const [loginPassword, setLoginPassword] = useState('');

  const [pagina, setPagina] = useState('menu');
  const [pedido, setPedido] = useState([]);

  const [modoAuth, setModoAuth] = useState('login'); // 'login' | 'registro'

  const [regNombre, setRegNombre] = useState('');
  const [regEmail, setRegEmail] = useState('');
  const [regPassword, setRegPassword] = useState('');
  const [regError, setRegError] = useState(null);
  const [regMiembro, setRegMiembro] = useState(false);

  const [tienePedidosListos, setTienePedidosListos] = useState(false);
  const [tienePedidosListosStaff, setTienePedidosListosStaff] = useState(false);

  // Metodo de pago preferido del usuario (para simulación de pagos)
  const [metodoPago, setMetodoPago] = useState('caja_efectivo'); 
  // 'caja_efectivo' | 'caja_tarjeta' | 'monedero_ulpgc'

  const [mensajePago, setMensajePago] = useState('');

  const esStaff = perfilUsuario?.tipo === 'staff';
  const esCocinero = perfilUsuario?.tipo === 'cocinero';
  const tieneRolPanel = esStaff || esCocinero;

  const [statsPanel, setStatsPanel] = useState({
    totalVentas: 0,
    numPedidos: 0,
    productoTopNombre: null,
  });
  const [panelTab, setPanelTab] = useState('pedidos'); // 'pedidos' | 'menu' (solo cocinero)

  
  const cargarMenu = async () => {
    try {
      const { data, error } = await supabase
        .from('productos')
        .select('id, nombre, precio, categoria_id, imagen_url, visible_cliente');

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
        visible_cliente: row.visible_cliente, // 👈 nuovo campo
      }));

      setMenuItems(itemsAdaptados);
      setCargandoMenu(false);
    } catch (e) {
      console.error('Error general cargando menú:', e);
    }
  };

  const alternarVisibilidadProducto = async (producto) => {
    const nuevoVisible = producto.visible_cliente === false ? true : false;

    const mensaje = nuevoVisible
      ? '¿Quieres volver a mostrar este producto en el menú general?'
      : '¿Seguro que quieres ocultar este producto del menú general?';

    const confirmar = window.confirm(mensaje);
    if (!confirmar) return;

    const { error } = await supabase
      .from('productos')
      .update({ visible_cliente: nuevoVisible })
      .eq('id', producto.id);

    if (error) {
      console.error('Error actualizando visibilidad del producto:', error);
      return;
    }

    // Ricarica il menu in app (clienti + panel)
    cargarMenu();
  };
  
  useEffect(() => {
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

    const { data: subscription } = supabase.auth.onAuthStateChange(
      (_event, session) => {
        setAuthUser(session?.user ?? null);
      }
    );

    return () => {
      subscription.subscription.unsubscribe();
    };
  }, []);


  const añadirAlPedido = (item) => {
    setMensajePago('');
    setPedido([...pedido, item]);
  };

  const eliminarDelPedido = (indiceAEliminar) => {
    setPedido((prev) => prev.filter((_, index) => index !== indiceAEliminar));
  };

  const totalBruto = pedido.reduce(
    (suma, item) => suma + Number(item.precio),
    0
  );

  const total = Math.round(totalBruto * 100) / 100;

  const vaciarPedido = () => {
    setPedido([]);
    setMensajePago('');
  };

  const totalFormatted = total.toFixed(2);


  async function guardarPedidoEnSupabase(pedido, total, metodoPagoActual) {
    try {
      if (!authUser) {
        console.warn('Intento de guardar un pedido sin usuario autenticado');
        return null;
      }
      let usuario;
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
      // traducimos el valor técnico a un texto más "bonito" para la BD
      let metodoTexto = 'caja_efectivo';
      if (metodoPagoActual === 'caja_tarjeta') metodoTexto = 'caja_tarjeta';
      if (metodoPagoActual === 'monedero_ulpgc') metodoTexto = 'monedero_ulpgc';

      const { error: pagoError } = await supabase.from('pagos').insert({
        pedido_id: nuevoPedido.id,
        metodo: metodoTexto,
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
    if (!authUser) {
      setAuthError('Debes iniciar sesión o crear una cuenta antes de confirmar el pedido.');
      setPagina('perfil');
      return;
    }
    const idPedido = await guardarPedidoEnSupabase(pedido, total, metodoPago);
    if (!idPedido) return;

    // Mensaje de simulación del pago según el método seleccionado
    let textoMetodo;
    if (metodoPago === 'caja_efectivo') {
      textoMetodo = 'Paga en caja al recoger tu pedido.';
    } else if (metodoPago === 'caja_tarjeta') {
      textoMetodo = 'Pedido pagado con tarjeta.';
    } else if (metodoPago === 'monedero_ulpgc') {
      textoMetodo = 'Pedido pagado con monedero digital ULPGC.';
    } else {
      textoMetodo = 'Pedido confirmado.';
    }

    setMensajePago(textoMetodo);
    // Vaciamos el carrito pero nos quedamos en la página "Mi pedido"
    setPedido([]);
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

  const actualizarEstadoPedidoPanel = async (id, nuevoEstado) => {
    const { error } = await supabase
      .from('pedidos')
      .update({ estado: nuevoEstado })
      .eq('id', id);

    if (error) {
      console.error(`Error actualizando pedido a ${nuevoEstado}:`, error);
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






  const cargarPerfilUsuario = useCallback(async () => {
    if (!authUser) {
      setPerfilUsuario(null);
      setPuntosUsuario(0);
      setHistorialPedidos([]);
      setTienePedidosListos(false);
      setTienePedidosListosStaff(false);
      return;
    }

    setCargandoPerfil(true);

    try {
      // 1. Buscar perfil en 'usuarios' por auth_id
      const { data: usuario, error: userError } = await supabase
        .from('usuarios')
        .select('id, nombre, email, tipo, miembro_ulpgc, metodo_pago_preferido')
        .eq('auth_id', authUser.id)
        .maybeSingle();
      
      // Si hay error real en la query
      if (userError) {
        console.error('Error leyendo perfil de usuarios:', userError);
        setPerfilUsuario(null);
        setPuntosUsuario(0);
        setHistorialPedidos([]);
        setTienePedidosListos(false);
        return;
      }

      // Si NO hay fila en usuarios para este authUser
      if (!usuario) {
        console.warn(
          'Usuario autenticado sin fila correspondiente en public.usuarios. ' +
          'Revisa el trigger que crea perfiles.'
        );
        setPerfilUsuario(null);
        setPuntosUsuario(0);
        setHistorialPedidos([]);
        setTienePedidosListos(false);
        return;
      }

      // Tenemos perfil correcto
      setPerfilUsuario(usuario);

      // Si es staff, comprobamos si hay pedidos "listo" para recoger
      if (usuario.tipo === 'staff') {
        const { data: pedidosListos, error: listosError } = await supabase
          .from('pedidos')
          .select('id')
          .eq('estado', 'listo')
          .limit(1);

        if (!listosError && pedidosListos && pedidosListos.length > 0) {
          setTienePedidosListosStaff(true);
        } else {
          setTienePedidosListosStaff(false);
        }
      } else {
        setTienePedidosListosStaff(false);
      }

      // Si el usuario tiene un método de pago guardado, lo usamos; si no, valor por defecto
      if (usuario.metodo_pago_preferido) {
        setMetodoPago(usuario.metodo_pago_preferido);
      } else {
        setMetodoPago('caja_efectivo');
      }

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

      // 3. Historial de pedidos del usuario
      const { data: pedidosUsuario, error: pedidosError } = await supabase
        .from('pedidos')
        .select('id, total, estado, creado_en')
        .eq('usuario_id', usuario.id)
        .order('creado_en', { ascending: false });

      if (pedidosError) {
        console.error('Error leyendo pedidos del usuario:', pedidosError);
        setHistorialPedidos([]);
        setTienePedidosListos(false);
        return;
      }

      if (pedidosUsuario && pedidosUsuario.length > 0) {
        // Ordenar por estado y fecha
        const ordenEstado = { en_preparacion: 0, listo: 1, recogido: 2 };

        const pedidosOrdenados = [...pedidosUsuario].sort((a, b) => {
          const ea = ordenEstado[a.estado] ?? 99;
          const eb = ordenEstado[b.estado] ?? 99;
          if (ea !== eb) return ea - eb;
          return new Date(b.creado_en).getTime() - new Date(a.creado_en).getTime();
        });

        setHistorialPedidos(pedidosOrdenados);

        const hayListos = pedidosOrdenados.some((p) => p.estado === 'listo');
        setTienePedidosListos(hayListos);
      } else {
        setHistorialPedidos([]);
        setTienePedidosListos(false);
      }

    } catch (e) {
      console.error('Error general cargando perfil de usuario:', e);
      setPerfilUsuario(null);
      setPuntosUsuario(0);
      setHistorialPedidos([]);
      setTienePedidosListos(false);
    } finally {
      setCargandoPerfil(false);
    }
  }, [authUser]);



  useEffect(() => {
    setMensajePago('');
  }, [pagina, authUser]);


  useEffect(() => {
    if (pagina !== 'perfil') return;

    cargarPerfilUsuario();
  }, [pagina, cargarPerfilUsuario]);




  useEffect(() => {
    if (authUser) {
      cargarPerfilUsuario();
    } else {
      setPerfilUsuario(null);
      setPuntosUsuario(0);
      setHistorialPedidos([]);
    }
  }, [authUser, cargarPerfilUsuario]);

  useEffect(() => {
    // Cuando cambiamos de usuario (o cerramos sesión), vaciamos el carrito
    setPedido([]);
  }, [authUser]);





  const actualizarMetodoPago = async (nuevoMetodo) => {
    setMetodoPago(nuevoMetodo);

    // Si quieres que quede guardado en la BD:
    if (!perfilUsuario) return;

    const { error } = await supabase
      .from('usuarios')
      .update({ metodo_pago_preferido: nuevoMetodo })
      .eq('id', perfilUsuario.id);

    if (error) {
      console.error('Error actualizando método de pago preferido:', error);
    }
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
    setTienePedidosListos(false);
    setTienePedidosListosStaff(false);
  };


  const handleRegister = async (e) => {
    e.preventDefault();
    setRegError(null);
    setAuthError(null);

    const { error } = await supabase.auth.signUp({
      email: regEmail,
      password: regPassword,
      options: {
        data: {
          nombre: regNombre,
          tipo: 'cliente',
          miembro_ulpgc: regMiembro,
        },
      },
    });

    if (error) {
      console.error('Error en registro:', error);
      setRegError(error.message);
      return;
    }

    const { error: loginError } = await supabase.auth.signInWithPassword({
      email: regEmail,
      password: regPassword,
    });

    if (loginError) {
      console.error('Error iniciando sesión después del registro:', loginError);
      setRegError(loginError.message);
      return;
    }

    setLoginEmail(regEmail);
    setLoginPassword(regPassword);
    setModoAuth('login');

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
        {tieneRolPanel && (
          <button
            className={pagina === 'panel' ? 'nav-btn active' : 'nav-btn'}
            onClick={() => setPagina('panel')}
          >
            🧑‍🍳 Panel interno
          </button>
        )}
        <button
          className={pagina === 'perfil' ? 'nav-btn active' : 'nav-btn'}
          onClick={() => setPagina('perfil')}
        >
          👤 Mi perfil
        </button>
      </nav>

      <main className="contenido">
        {pagina === 'menu' && (
          <Menu
            items={menuItems.filter((item) => item.visible_cliente !== false)}
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
                    <li key={index} className="item-pedido">
                      <span>
                        {item.nombre} – {item.precio.toFixed(2)} €
                      </span>
                      <button
                        type="button"
                        className="btn-eliminar-linea"
                        aria-label="Quitar este producto del pedido"
                        onClick={() => eliminarDelPedido(index)}
                      >
                        ×
                      </button>
                    </li>
                  ))}
                </ul>
                <p className="total">
                  Total: <strong>{total.toFixed(2)} €</strong>
                </p>
                <button onClick={vaciarPedido}>Vaciar pedido</button>
                {pedido.length > 0 && (
                  <>
                    <button
                      style={{ marginLeft: '0.5rem' }}
                      onClick={confirmarPedido}
                    >
                      Confirmar pedido
                    </button>
                    {!authUser && (
                      <p className="texto-aviso-auth">
                        Para confirmar el pedido debes iniciar sesión o crear una cuenta.
                      </p>
                    )}
                  </>
                )}
              </>
            )}

            {mensajePago && (
              <p className="mensaje-pago-ok">
                {mensajePago}
              </p>
            )}
          </section>
        )}

        {pagina === 'panel' && (
          <>
            {!authUser && (
              <p>
                Solo el personal puede acceder al panel interno.  
                Inicia sesión con una cuenta de personal.
              </p>
            )}

            {authUser && !tieneRolPanel && (
              <p>
                Tu usuario no tiene permisos de personal para ver el panel interno.
              </p>
            )}

            {authUser && tieneRolPanel && (
              <section>
                <div className="panel-card">
                  {/* Titolo generale */}
                  <h2 className="panel-title">Panel interno</h2>

                  {/* Toggle grande Pedidos / Menú (solo cocinero) */}
                  {esCocinero && (
                    <div className="panel-tabs-main">
                      <button
                        type="button"
                        className={panelTab === 'pedidos' ? 'panel-tab active' : 'panel-tab'}
                        onClick={() => setPanelTab('pedidos')}
                      >
                        Pedidos
                      </button>
                      <button
                        type="button"
                        className={panelTab === 'menu' ? 'panel-tab active' : 'panel-tab'}
                        onClick={() => setPanelTab('menu')}
                      >
                        Menú
                      </button>
                    </div>
                  )}

                  {/* STAFF (solo pedidos, niente tab) */}
                  {!esCocinero && (
                    <p className="panel-subtitle">
                      Gestión de pedidos del día.
                    </p>
                  )}

                  {/* VISTA DE PEDIDOS (staff y cocinero) */}
                  {(!esCocinero || panelTab === 'pedidos') && (
                    <>
                      <button
                        className="btn-actualizar-panel"
                        onClick={() => {
                          cargarPedidosPanel();
                          if (esStaff) {
                            cargarEstadisticasPanel();
                          }
                        }}
                      >
                        Actualizar lista
                      </button>

                      {cargandoPanel && <p>Cargando pedidos...</p>}

                      {!cargandoPanel && pedidosPanel.length === 0 && (
                        <p>No hay pedidos registrados.</p>
                      )}

                      {esStaff && (
                        <div className="panel-dashboard">
                          <h3>Resumen de ventas</h3>
                          <p>
                            Ventas totales registradas:{' '}
                            {statsPanel.totalVentas.toFixed(2)} €
                          </p>
                          <p>Número de pedidos: {statsPanel.numPedidos}</p>
                          {statsPanel.productoTopNombre && (
                            <p>Producto más pedido: {statsPanel.productoTopNombre}</p>
                          )}
                        </div>
                      )}

                      {!cargandoPanel && pedidosPanel.length > 0 && (
                        <ul className="lista-pedidos-panel">
                          {pedidosPanel.map((p) => {
                            const puedeMarcarListo =
                              esCocinero && p.estado === 'en_preparacion';
                            const puedeMarcarRecogido =
                              esStaff && p.estado === 'listo';

                            return (
                              <li key={p.id}>
                                <div>
                                  <strong>Pedido #{p.id}</strong> –{' '}
                                  {p.total.toFixed(2)} € – Estado: {p.estado}
                                </div>
                                <div className="panel-actions">
                                  {puedeMarcarListo && (
                                    <button
                                      onClick={() =>
                                        actualizarEstadoPedidoPanel(p.id, 'listo')
                                      }
                                    >
                                      Marcar como listo
                                    </button>
                                  )}
                                  {puedeMarcarRecogido && (
                                    <button
                                      onClick={() =>
                                        actualizarEstadoPedidoPanel(p.id, 'recogido')
                                      }
                                    >
                                      Marcar como recogido
                                      </button>
                                  )}
                                </div>
                              </li>
                            );
                          })}
                        </ul>
                      )}
                    </>
                  )}

                  {/* VISTA DE MENÚ (vacía por ahora) */}
                  {esCocinero && panelTab === 'menu' && (
                    <div className="panel-menu-admin">
                      <h3>Menú actual</h3>
                      <p
                        style={{
                          fontSize: '0.9rem',
                          color: '#4b5563',
                          marginBottom: '0.75rem',
                        }}
                      >
                        Vista del menú tal y como lo ve un cliente, pero aquí puedes ocultar o mostrar productos.
                      </p>

                      {cargandoMenu ? (
                        <p>Cargando menú…</p>
                      ) : menuItems.length === 0 ? (
                        <p>No hay productos en el menú.</p>
                      ) : (
                        <div className="menu-grid">
                          {menuItems.map((item) => (
                            <div
                              key={item.id}
                              className={
                                item.visible_cliente === false
                                  ? 'menu-card menu-card-oculto'
                                  : 'menu-card'
                              }
                            >
                              {item.imagen && (
                                <img
                                  src={item.imagen}
                                  alt={item.nombre}
                                  className="menu-img"
                                />
                              )}
                              <h3 className="menu-title">{item.nombre}</h3>
                              <p className="menu-price">{item.precio.toFixed(2)} €</p>

                              {item.visible_cliente === false && (
                                <p className="badge-oculto">
                                  Oculto en el menú de clientes
                                </p>
                              )}

                              <button
                                type="button"
                                className="btn-eliminar-linea"
                                onClick={() => alternarVisibilidadProducto(item)}
                              >
                                {item.visible_cliente === false
                                  ? 'Mostrar en menú'
                                  : 'Quitar del menú'}
                              </button>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  )}
                </div>
              </section>
            )}
          </>
        )}

        {pagina === 'perfil' && (
          <section>
            <h2>Mi perfil</h2>

            {/* Alerta para clientes con pedidos listos */}
            {authUser && !cargandoPerfil && perfilUsuario && perfilUsuario.tipo === 'cliente' && tienePedidosListos && (
              <div className="alert-pedido-global">
                <strong>¡Pedido listo!</strong>{' '}
                Tienes al menos un pedido marcado como "listo" para recoger.
              </div>
            )}

            {/* Alerta para personal de sala (staff) cuando hay pedidos listos en general */}
            {authUser && !cargandoPerfil && perfilUsuario && perfilUsuario.tipo === 'staff' && tienePedidosListosStaff && (
              <div className="alert-pedido-global">
                <strong>Pedidos listos</strong>{' '}
                Hay pedidos marcados como "listo" para recoger en la cafetería.
              </div>
            )}

            {authLoading && <p>Comprobando sesión...</p>}

            {/* Se NON hay usuario logueado → formulario de login */}
            {!authLoading && !authUser && (
              <div className="login-card">
                <div className="auth-toggle">
                  <button
                    type="button"
                    className={modoAuth === 'login' ? 'auth-tab active' : 'auth-tab'}
                    onClick={() => {
                      setModoAuth('login');
                      setAuthError(null);
                      setRegError(null);
                    }}
                  >
                    Iniciar sesión
                  </button>
                  <button
                    type="button"
                    className={modoAuth === 'registro' ? 'auth-tab active' : 'auth-tab'}
                    onClick={() => {
                      setModoAuth('registro');
                      setAuthError(null);
                      setRegError(null);
                    }}
                  >
                    Crear cuenta
                  </button>
                </div>

                {modoAuth === 'login' && (
                  <>
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
                  </>
                )}

                {modoAuth === 'registro' && (
                  <>
                    <h3 className="login-title">Crear una nueva cuenta</h3>
                    <p className="login-subtitle">
                      Regístrate para acumular puntos y ver tu historial de pedidos.
                    </p>

                    <form onSubmit={handleRegister} className="login-form">
                      <div className="login-field">
                        <label>Nombre</label>
                        <input
                          type="text"
                          value={regNombre}
                          onChange={(e) => setRegNombre(e.target.value)}
                          placeholder="Nombre y apellidos"
                          required
                        />
                      </div>

                      <div className="login-field">
                        <label>Correo electrónico</label>
                        <input
                          type="email"
                          value={regEmail}
                          onChange={(e) => setRegEmail(e.target.value)}
                          placeholder="ejemplo@ulpgc.es"
                          required
                        />
                      </div>

                      <div className="login-field">
                        <label>Contraseña</label>
                        <input
                          type="password"
                          value={regPassword}
                          onChange={(e) => setRegPassword(e.target.value)}
                          placeholder="Mínimo 6 caracteres"
                          required
                        />
                      </div>

                      <div className="login-field">
                        <label>¿Eres miembro de la ULPGC (estudiante/profesor)?</label>
                        <div className="login-radio-row">
                          <label>
                            <input
                              type="radio"
                              name="miembroULPGC"
                              value="si"
                              checked={regMiembro === true}
                              onChange={() => setRegMiembro(true)}
                            />
                            {' '}Sí
                          </label>
                          <label>
                            <input
                              type="radio"
                              name="miembroULPGC"
                              value="no"
                              checked={regMiembro === false}
                              onChange={() => setRegMiembro(false)}
                            />
                            {' '}No
                          </label>
                        </div>
                      </div>

                      <button type="submit" className="btn-primary">
                        Crear cuenta
                      </button>

                      {regError && <p className="error-text">{regError}</p>}
                    </form>
                  </>
                )}
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
                        {perfilUsuario.tipo === 'staff'
                          ? 'personal Las Casitas'
                          : perfilUsuario.tipo === 'cocinero'
                          ? 'cocinero Las Casitas'
                          : `cliente${perfilUsuario.miembro_ulpgc ? ' – miembro ULPGC' : ''}`}
                      </p>
                      {perfilUsuario.tipo === 'cliente' && (
                        <p>
                          <strong>Puntos acumulados:</strong> {puntosUsuario}
                        </p>
                      )}
                    </div>

                <div className="perfil-actions">
                  <button className="btn-secondary" onClick={handleLogout}>
                    Cerrar sesión
                  </button>
                </div>

                {historialPedidos && historialPedidos.length > 0 && perfilUsuario.tipo === 'cliente' && (
                  <>
                    <h3 className="perfil-historial-titulo">
                      Historial de pedidos
                    </h3>
                    <ul className="lista-historial">
                      {historialPedidos.map((pedido) => {
                        let badgeClass = 'estado-badge';
                        if (pedido.estado === 'en_preparacion') badgeClass += ' en-preparacion';
                        if (pedido.estado === 'listo') badgeClass += ' listo';
                        if (pedido.estado === 'recogido') badgeClass += ' recogido';

                        return (
                          <li key={pedido.id} className="historial-item">
                            <div className="historial-main">
                              <div>
                                <strong>Pedido #{pedido.id}</strong> – {pedido.total.toFixed(2)} €
                                <div>
                                  <small>
                                    {pedido.creado_en &&
                                      new Date(pedido.creado_en).toLocaleString()}
                                  </small>
                                </div>
                              </div>
                              <span className={badgeClass}>
                                {pedido.estado === 'en_preparacion' && 'En preparación'}
                                {pedido.estado === 'listo' && 'Listo para recoger'}
                                {pedido.estado === 'recogido' && 'Recogido'}
                                {!['en_preparacion', 'listo', 'recogido'].includes(pedido.estado) &&
                                  pedido.estado}
                              </span>
                            </div>
                          </li>
                        );
                      })}
                    </ul>
                  </>
                )}
              </div>
            )}

            {/* Card separata per la simulación de pagos */}
            {authUser && !cargandoPerfil && perfilUsuario && perfilUsuario.tipo === 'cliente' && (
              <div className="perfil-card perfil-card-secundaria">
                <h3 className="perfil-historial-titulo">Método de pago preferido</h3>
                <p className="perfil-metodo-sub">
                  Elige cómo prefieres pagar tus pedidos.
                </p>

                <div className="metodo-pago-opciones">
                  <label className="metodo-pago-opcion">
                    <input
                      type="radio"
                      name="metodoPago"
                      value="caja_efectivo"
                      checked={metodoPago === 'caja_efectivo'}
                      onChange={() => actualizarMetodoPago('caja_efectivo')}
                    />
                    <span>Pagar en caja (efectivo)</span>
                  </label>

                  <label className="metodo-pago-opcion">
                    <input
                      type="radio"
                      name="metodoPago"
                      value="caja_tarjeta"
                      checked={metodoPago === 'caja_tarjeta'}
                      onChange={() => actualizarMetodoPago('caja_tarjeta')}
                    />
                    <span>Pagar en caja (tarjeta)</span>
                  </label>

                  <label
                    className={
                      'metodo-pago-opcion' +
                      (!perfilUsuario.miembro_ulpgc ? ' metodo-pago-opcion-disabled' : '')
                    }
                  >
                    <input
                      type="radio"
                      name="metodoPago"
                      value="monedero_ulpgc"
                      checked={metodoPago === 'monedero_ulpgc'}
                      onChange={() => actualizarMetodoPago('monedero_ulpgc')}
                      disabled={!perfilUsuario.miembro_ulpgc}
                    />
                    <span>
                      Monedero digital ULPGC
                      {!perfilUsuario.miembro_ulpgc && ' (solo para miembros ULPGC)'}
                    </span>
                  </label>
                </div>
              </div>
            )}

            {/* Caso raro: hay usuario autenticado pero no se ha encontrado su fila en public.usuarios */}
            {authUser && !cargandoPerfil && !perfilUsuario && (
              <div className="perfil-card">
                <div className="perfil-header">
                  <div>
                    <h3 className="perfil-nombre">
                      {authUser.email || 'Usuario'}
                    </h3>
                    <p className="perfil-email">
                      {authUser.email}
                    </p>
                  </div>
                  <span className="perfil-badge perfil-badge-warning">
                    Perfil incompleto
                  </span>
                </div>

                <p>
                  No se ha encontrado tu perfil en la base de datos de Las Casitas.
                  Es posible que se haya borrado la fila correspondiente en la tabla
                  <code> public.usuarios</code>.
                </p>
                <p>
                  Puedes cerrar sesión y volver a registrarte para que se cree de nuevo
                  tu perfil correctamente.
                </p>

                <div className="perfil-actions">
                  <button className="btn-secondary" onClick={handleLogout}>
                    Cerrar sesión
                  </button>
                </div>
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