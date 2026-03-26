export interface Product {
  id: string | number;
  name: string;
  sku: string;
  category: string;
  qty: number;
  price: string;
  status: string;
}

interface ProductTableProps {
  products: Product[];
  onRestock: (id: string | number) => void;
  onEdit: (id: string | number) => void;
  onDelete: (id: string | number) => void;
  mutatingProductId?: string | number | null;
}

export const ProductTable = ({
  products,
  onRestock,
  onEdit,
  onDelete,
  mutatingProductId,
}: ProductTableProps) => {
  return (
    <div className="rounded-lg border border-gray-200 bg-white shadow-sm overflow-hidden">
      <table className="w-full caption-bottom text-sm text-gray-900">
        <thead className="bg-gray-50/50">
          <tr className="border-b border-gray-200">
            <th className="h-12 px-4 text-left align-middle font-medium text-gray-500">
              Product
            </th>
            <th className="hidden sm:table-cell h-12 px-4 text-left align-middle font-medium text-gray-500">
              SKU
            </th>
            <th className="hidden md:table-cell h-12 px-4 text-left align-middle font-medium text-gray-500">
              Category
            </th>
            <th className="h-12 px-4 align-middle font-medium text-gray-500 text-right">
              Qty
            </th>
            <th className="hidden lg:table-cell h-12 px-4 align-middle font-medium text-gray-500 text-right">
              Price
            </th>
            <th className="h-12 px-4 text-left align-middle font-medium text-gray-500">
              Status
            </th>
            <th className="h-12 px-4 w-10"></th>
          </tr>
        </thead>
        <tbody className="[&_tr:last-child]:border-0">
          {products.length > 0 ? (
            products.map((p) => (
              <tr
                key={p.id}
                className="border-b border-gray-100 hover:bg-gray-50 transition-colors"
              >
                <td className="p-4 align-middle font-medium text-gray-900">
                  {p.name}
                  <div className="sm:hidden text-xs text-gray-500 mt-1 font-mono">
                    {p.sku}
                  </div>
                </td>
                <td className="hidden sm:table-cell p-4 align-middle font-mono text-gray-500">
                  {p.sku}
                </td>
                <td className="hidden md:table-cell p-4 align-middle text-gray-600">
                  {p.category}
                </td>
                <td className="p-4 align-middle text-right tabular-nums text-gray-900">
                  {p.qty}
                </td>
                <td className="hidden lg:table-cell p-4 align-middle text-right tabular-nums text-gray-600">
                  {p.price}
                </td>
                <td className="p-4 align-middle">
                  <span
                    className={`inline-flex rounded-full px-2.5 py-0.5 text-xs font-medium ${p.qty === 0 ? "bg-red-100 text-red-700" : "bg-emerald-100 text-emerald-700"}`}
                  >
                    {p.status}
                  </span>
                </td>
                <td className="p-4 align-middle">
                  <div className="flex items-center justify-end gap-2">
                    <button
                      onClick={() => onRestock(p.id)}
                      disabled={mutatingProductId === p.id}
                      className="text-xs font-medium text-blue-600 hover:text-blue-800 hover:underline disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      Restock
                    </button>
                    <button
                      onClick={() => onEdit(p.id)}
                      disabled={mutatingProductId === p.id}
                      className="text-xs font-medium text-amber-600 hover:text-amber-800 hover:underline disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      Edit
                    </button>
                    <button
                      onClick={() => onDelete(p.id)}
                      disabled={mutatingProductId === p.id}
                      className="text-xs font-medium text-red-600 hover:text-red-800 hover:underline disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      Delete
                    </button>
                  </div>
                </td>
              </tr>
            ))
          ) : (
            <tr>
              <td colSpan={7} className="p-8 text-center text-gray-500">
                No products found.
              </td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
  );
};
