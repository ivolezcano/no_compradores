'use client';
import React, { useEffect, useState } from 'react';
import * as XLSX from 'xlsx';

interface Cliente {
  Codigo?: string | number;
  ['Codigo Cliente']?: string | number;
  Cliente?: string;
  Nombre?: string;
  Productos?: string;
  Telefono?: string | number;
  Resultado?: string;
  Motivo?: string;
  [key: string]: any;
}

export default function HomePage() {
  const [data, setData] = useState<Cliente[]>([]);
  const [currentIndex, setCurrentIndex] = useState<number>(0);
  const [showPopup, setShowPopup] = useState<boolean>(false);
  const [motivo, setMotivo] = useState<string>('');
  const [loading, setLoading] = useState<boolean>(true);
  const [selectedCliente, setSelectedCliente] = useState<Cliente | null>(null);
  const [searchTerm, setSearchTerm] = useState<string>('');

  // 🧠 Leer Excel
  useEffect(() => {
    const fetchExcel = async () => {
      try {
        const res = await fetch('/uploads/base_no_compradores.xlsx');
        const arrayBuffer = await res.arrayBuffer();
        const workbook = XLSX.read(arrayBuffer, { type: 'array' });
        const sheet = workbook.Sheets['retorno'];
        if (sheet) {
          const json: Cliente[] = XLSX.utils.sheet_to_json(sheet);
          setData(json);
        } else {
          console.error('❌ No se encontró la hoja "retorno"');
        }
      } catch (error) {
        console.error('Error al leer Excel:', error);
      } finally {
        setLoading(false);
      }
    };
    fetchExcel();
  }, []);

  // 📞 Enviar WhatsApp
  const handleWhatsApp = (telefono: string | number, cliente: Cliente) => {
    const mensaje = encodeURIComponent(`Hola ${cliente.Cliente || cliente.Nombre || 'Cliente'}!`);
    window.open(`https://wa.me/${telefono}?text=${mensaje}`, '_blank');

    // ✅ Marcar como pendiente
    const updated = [...data];
    const idx = data.indexOf(cliente);
    updated[idx] = { ...cliente, Resultado: 'Pendiente ⏳' };
    setData(updated);

    // Avanza al siguiente
    setCurrentIndex((prev) => prev + 1);
  };

  // 💾 Registrar resultado (compra o no compra)
  const handleCompra = (compra: boolean) => {
    if (!selectedCliente) return;

    const updated = [...data];
    const idx = data.indexOf(selectedCliente);

    if (idx !== -1) {
      updated[idx] = compra
        ? { ...selectedCliente, Resultado: 'Compró ✅', Motivo: '' }
        : { ...selectedCliente, Resultado: 'No compró ❌', Motivo: motivo || '' };
      setData(updated);
    }

    setMotivo('');
    setShowPopup(false);
    setSelectedCliente(null);
  };

  // 📤 Exportar Excel (actualiza la hoja retorno)
  const handleExport = () => {
    const ws = XLSX.utils.json_to_sheet(data);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'retorno');
    XLSX.writeFile(wb, 'base_no_compradores.xlsx');
  };

  const pendientes = data.filter((c) => c.Resultado === 'Pendiente ⏳');
  const clientesFiltrados = pendientes.filter((c) => {
    const texto = (c.Cliente || c.Nombre || '').toString().toLowerCase();
    const codigo = (c.Codigo || c['Codigo Cliente'] || '').toString().toLowerCase();
    const term = searchTerm.toLowerCase();
    return texto.includes(term) || codigo.includes(term);
  });

  // ⏳ Cargando
  if (loading)
    return (
      <div className="flex items-center justify-center min-h-screen">
        <p>⏳ Cargando datos...</p>
      </div>
    );

  // ⚠️ Sin datos
  if (!data.length)
    return (
      <div className="flex items-center justify-center min-h-screen">
        <p className="text-red-500">⚠️ No se encontraron datos en la hoja “retorno”.</p>
      </div>
    );

  const cliente = data[currentIndex];
  const nombreCliente = cliente.Cliente || cliente.Nombre || 'Cliente';
  const codigo = cliente.Codigo || cliente['Codigo Cliente'] || 'Sin código';
  const telefono = cliente.Telefono?.toString() || '';

  return (
    <div className="flex flex-row min-h-screen p-4 bg-gray-50">
      {/* Panel principal */}
      <div className="flex flex-col items-center justify-center flex-1">
        {currentIndex < data.length ? (
          <div className="bg-white shadow-lg rounded-2xl p-6 w-full max-w-lg text-center">
            <h2 className="text-2xl font-bold mb-2">{nombreCliente}</h2>
            <p className="text-gray-600 mb-2">Código: {codigo}</p>
            <p className="text-gray-600 mb-4">🛒 {cliente.Productos}</p>

            <div className="flex justify-center gap-3">
              <button
                onClick={() => handleWhatsApp(telefono, cliente)}
                className="bg-green-500 text-white px-4 py-2 rounded-lg cursor-pointer hover:bg-green-600 transition"
              >
                Enviar WhatsApp
              </button>
            </div>
          </div>
        ) : (
          <div className="flex flex-col items-center justify-center">
            <h2 className="text-xl mb-4">✅ Todos los registros vistos</h2>
          </div>
        )}

        <button
          onClick={handleExport}
          className="bg-green-600 text-white mt-6 px-4 py-2 rounded-lg cursor-pointer hover:bg-green-700 transition"
        >
          Descargar Excel actualizado
        </button>
      </div>

      {/* Panel lateral derecho */}
      <div className="w-80 bg-white shadow-lg rounded-2xl p-4 ml-6 flex flex-col">
        <h3 className="text-lg font-semibold mb-3 text-center">Pendientes ⏳</h3>
        <input
          type="text"
          placeholder="Buscar por nombre o código..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="border p-2 rounded-lg mb-3 w-full"
        />

        <div className="overflow-y-auto flex-1">
          {clientesFiltrados.length > 0 ? (
            clientesFiltrados.map((c, i) => (
              <div
                key={i}
                onClick={() => setSelectedCliente(c)}
                className="p-2 border-b cursor-pointer hover:bg-gray-100 rounded transition"
              >
                <p className="font-medium">{c.Cliente || c.Nombre}</p>
                <p className="text-sm text-gray-500">Código: {c.Codigo || c['Codigo Cliente']}</p>
              </div>
            ))
          ) : (
            <p className="text-gray-400 text-center">No hay coincidencias</p>
          )}
        </div>
      </div>

      {/* Popup de selección de pendiente */}
      {selectedCliente && (
        <div className="fixed inset-0 bg-black bg-opacity-40 flex items-center justify-center">
          <div className="bg-white p-6 rounded-xl shadow-lg text-center w-80">
            <h3 className="text-lg font-semibold mb-3">
              {selectedCliente.Cliente || selectedCliente.Nombre}
            </h3>
            <p className="mb-4 text-gray-500">¿Compró o no?</p>

            <div className="flex justify-center gap-3 mb-3">
              <button
                onClick={() => handleCompra(true)}
                className="bg-blue-500 text-white px-4 py-2 rounded-lg cursor-pointer hover:bg-blue-600 transition"
              >
                ¡Compró!
              </button>
              <button
                onClick={() => setShowPopup(true)}
                className="bg-red-500 text-white px-4 py-2 rounded-lg cursor-pointer hover:bg-red-600 transition"
              >
                No compró
              </button>
            </div>

            <button
              onClick={() => setSelectedCliente(null)}
              className="bg-gray-300 px-4 py-2 rounded-lg cursor-pointer hover:bg-gray-400 transition"
            >
              Cerrar
            </button>
          </div>
        </div>
      )}

      {/* Popup motivo */}
      {showPopup && (
        <div className="fixed inset-0 bg-black bg-opacity-40 flex items-center justify-center">
          <div className="bg-white p-6 rounded-xl shadow-lg text-center w-80">
            <h3 className="text-lg font-semibold mb-3">Motivo de no compra</h3>
            <textarea
              value={motivo}
              onChange={(e) => setMotivo(e.target.value)}
              className="border rounded w-full p-2 mb-4"
              placeholder="Escribí el motivo..."
            />
            <div className="flex justify-center gap-3">
              <button
                onClick={() => handleCompra(false)}
                className="bg-red-500 text-white px-4 py-2 rounded-lg cursor-pointer hover:bg-red-600 transition"
              >
                Guardar
              </button>
              <button
                onClick={() => {
                  setShowPopup(false);
                  setMotivo('');
                }}
                className="bg-gray-300 px-4 py-2 rounded-lg cursor-pointer hover:bg-gray-400 transition"
              >
                Cancelar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
