'use client';
import React, { useEffect, useState } from 'react';
import * as XLSX from 'xlsx';

// 🧾 Tipos
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
  const [results, setResults] = useState<Cliente[]>([]);
  const [loading, setLoading] = useState<boolean>(true);

  // 🧠 Leer Excel automáticamente al cargar
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
  const handleWhatsApp = (telefono: string | number, cliente: string) => {
    const mensaje = encodeURIComponent(`Hola ${cliente}!`);
    window.open(`https://wa.me/${telefono}?text=${mensaje}`, '_blank');
  };

  // 💾 Registrar resultado
  const handleCompra = (compra: boolean) => {
    const cliente = data[currentIndex];
    if (!cliente) return;

    const resultado: Cliente = compra
      ? { ...cliente, Resultado: 'Compró ✅' }
      : { ...cliente, Resultado: 'No compró', Motivo: motivo || '' };

    setResults((prev) => [...prev, resultado]);
    setMotivo('');
    setShowPopup(false);
    setCurrentIndex((prev) => prev + 1);
  };

  // 📤 Exportar Excel
  const handleExport = () => {
    const ws = XLSX.utils.json_to_sheet(results);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Resultados');
    XLSX.writeFile(wb, 'resultados.xlsx');
  };

  // ⏳ Cargando
  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <p className="text-lg">⏳ Cargando datos...</p>
      </div>
    );
  }

  // ⚠️ Sin datos
  if (!data.length) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <p className="text-lg text-red-500">
          ⚠️ No se encontraron datos en la hoja “retorno”
        </p>
      </div>
    );
  }

  // ✅ Todos procesados
  if (currentIndex >= data.length) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen">
        <h2 className="text-xl mb-4">✅ Todos los registros procesados</h2>
        <button
          onClick={handleExport}
          className="bg-green-500 text-white px-4 py-2 rounded-lg"
        >
          Descargar Excel actualizado
        </button>
      </div>
    );
  }

  const cliente = data[currentIndex];
  const nombreCliente = cliente.Cliente || cliente.Nombre || 'Cliente';
  const codigo =
    cliente.Codigo || cliente['Codigo Cliente'] || 'Sin código';
  const telefono = cliente.Telefono?.toString() || '';

  // 🎯 Render principal
  return (
    <div className="flex flex-col items-center justify-center min-h-screen p-6">
      <div className="bg-white shadow-lg rounded-2xl p-6 w-full max-w-lg text-center">
        <h2 className="text-2xl font-bold mb-2">{nombreCliente}</h2>
        <p className="text-gray-600 mb-2">Código: {codigo}</p>
        <p className="text-gray-600 mb-4">🛒 {cliente.Productos}</p>

        <div className="flex justify-center gap-3">
          <button
            onClick={() => handleWhatsApp(telefono, nombreCliente)}
            className="bg-green-500 text-white px-4 py-2 rounded-lg"
          >
            Enviar WhatsApp
          </button>
          <button
            onClick={() => handleCompra(true)}
            className="bg-blue-500 text-white px-4 py-2 rounded-lg"
          >
            ¡Compró!
          </button>
          <button
            onClick={() => setShowPopup(true)}
            className="bg-red-500 text-white px-4 py-2 rounded-lg"
          >
            No Compró
          </button>
        </div>
      </div>

      {/* 💬 Popup motivo */}
      {showPopup && (
        <div className="fixed inset-0 bg-black bg-opacity-40 flex items-center justify-center">
          <div className="bg-white p-6 rounded-xl shadow-lg text-center">
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
                className="bg-red-500 text-white px-4 py-2 rounded-lg"
              >
                Guardar
              </button>
              <button
                onClick={() => setShowPopup(false)}
                className="bg-gray-300 px-4 py-2 rounded-lg"
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
