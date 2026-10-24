
import { useCallback, useEffect, useMemo, useState } from 'react'
import './App.css'

const API_BASE_URL = (
  import.meta.env.VITE_API_BASE_URL || 'http://localhost:8080'
).replace(/\/$/, '')

const EMPTY_FORM = { name: '', price: '', stockQuantity: '' }

function App() {
  const [products, setProducts] = useState([])
  const [search, setSearch] = useState('')
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [notice, setNotice] = useState('')
  const [modalOpen, setModalOpen] = useState(false)
  const [editingProduct, setEditingProduct] = useState(null)
  const [form, setForm] = useState(EMPTY_FORM)
  const [deletingId, setDeletingId] = useState(null)

  const loadProducts = useCallback(async () => {
    setLoading(true)
    setError('')

    try {
      const response = await fetch(`${API_BASE_URL}/api/products`)

      if (!response.ok) {
        throw new Error(`Unable to load products (HTTP ${response.status}).`)
      }

      const data = await response.json()

      if (!Array.isArray(data)) {
        throw new Error('The products API returned an unexpected response.')
      }

      setProducts(data)
    } catch (err) {
      setError(
        err instanceof TypeError
          ? 'Cannot connect to the backend. Check that Spring Boot is running and CORS is configured.'
          : err.message || 'Something went wrong while loading products.',
      )
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    loadProducts()
  }, [loadProducts])

  const activeProducts = products.filter((product) => product.active !== false)
  const totalUnits = activeProducts.reduce(
    (sum, product) => sum + Number(product.stockQuantity || 0),
    0,
  )
  const inventoryValue = activeProducts.reduce(
    (sum, product) =>
      sum + Number(product.price || 0) * Number(product.stockQuantity || 0),
    0,
  )
  const lowStockCount = activeProducts.filter(
    (product) => Number(product.stockQuantity) <= 10,
  ).length

  const filteredProducts = useMemo(() => {
    const query = search.trim().toLowerCase()

    return products.filter(
      (product) =>
        String(product.name || '').toLowerCase().includes(query) ||
        String(product.id).includes(query),
    )
  }, [products, search])

  function openAddModal() {
    setEditingProduct(null)
    setForm(EMPTY_FORM)
    setNotice('')
    setError('')
    setModalOpen(true)
  }

  function openEditModal(product) {
    setEditingProduct(product)
    setForm({
      name: product.name ?? '',
      price: String(product.price ?? ''),
      stockQuantity: String(product.stockQuantity ?? ''),
    })
    setNotice('')
    setError('')
    setModalOpen(true)
  }

  function closeModal() {
    if (saving) return
    setModalOpen(false)
    setEditingProduct(null)
    setForm(EMPTY_FORM)
  }

  function updateForm(event) {
    const { name, value } = event.target
    setForm((current) => ({ ...current, [name]: value }))
  }

  async function handleSubmit(event) {
    event.preventDefault()
    setError('')
    setNotice('')

    const name = form.name.trim()
    const price = Number(form.price)
    const stockQuantity = Number(form.stockQuantity)

    if (!name) {
      setError('Product name is required.')
      return
    }

    if (form.price.trim() === '' || !Number.isFinite(price) || price < 0) {
      setError('Enter a valid price greater than or equal to zero.')
      return
    }

    if (
      form.stockQuantity.trim() === '' ||
      !Number.isInteger(stockQuantity) ||
      stockQuantity < 0
    ) {
      setError('Stock quantity must be a non-negative whole number.')
      return
    }

    const payload = { name, price, stockQuantity }
    const isEditing = Boolean(editingProduct)
    const url = isEditing
      ? `${API_BASE_URL}/api/products/${editingProduct.id}`
      : `${API_BASE_URL}/api/products`

    setSaving(true)

    try {
      const response = await fetch(url, {
        method: isEditing ? 'PUT' : 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      })

      if (!response.ok) {
        const message = await response.text()
        throw new Error(
          message || `Unable to save product (HTTP ${response.status}).`,
        )
      }

      setModalOpen(false)
      setEditingProduct(null)
      setForm(EMPTY_FORM)
      setNotice(isEditing ? 'Product updated successfully.' : 'Product added successfully.')
      await loadProducts()
    } catch (err) {
      setError(
        err instanceof TypeError
          ? 'Cannot reach the backend. Check the server and CORS settings.'
          : err.message || 'Unable to save the product.',
      )
    } finally {
      setSaving(false)
    }
  }

  async function handleDelete(product) {
    const confirmed = window.confirm(
      `Delete "${product.name}" (ID ${product.id})? This action cannot be undone.`,
    )

    if (!confirmed) return

    setDeletingId(product.id)
    setError('')
    setNotice('')

    try {
      const response = await fetch(
        `${API_BASE_URL}/api/products/${product.id}`,
        { method: 'DELETE' },
      )

      if (!response.ok) {
        const message = await response.text()
        throw new Error(
          message || `Unable to delete product (HTTP ${response.status}).`,
        )
      }

      setNotice(`"${product.name}" deleted successfully.`)
      await loadProducts()
    } catch (err) {
      setError(
        err instanceof TypeError
          ? 'Cannot reach the backend. Check the server and CORS settings.'
          : err.message || 'Unable to delete the product.',
      )
    } finally {
      setDeletingId(null)
    }
  }

  const currency = (amount) =>
    new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      maximumFractionDigits: 2,
    }).format(Number(amount || 0))

  return (
    <div className="app-shell">
      <aside className="sidebar">
        <a className="brand" href="#dashboard" aria-label="StockFlow home">
          <span className="brand-mark">S</span>
          <span>stockflow<span className="brand-period">.</span></span>
        </a>

        <div className="nav-label">WORKSPACE</div>
        <a className="nav-item active" href="#dashboard">
          <span className="nav-icon">▦</span> Dashboard
        </a>
        <a className="nav-item" href="#products">
          <span className="nav-icon">▤</span> Products
        </a>

        <div className="sidebar-bottom">
          <div className="connection-dot" />
          <div>
            <strong>Local environment</strong>
            <span>StockFlow API</span>
          </div>
        </div>
      </aside>

      <main className="main-content" id="dashboard">
        <header className="topbar">
          <div className="breadcrumb">Workspace <span>/</span> Inventory</div>
          <div className="topbar-right">
            <span className="api-status">
              <span className={`status-dot ${error ? 'offline' : ''}`} />
              {error ? 'Check connection' : loading ? 'Connecting…' : 'Inventory API'}
            </span>
            <div className="avatar">SF</div>
          </div>
        </header>

        <section className="page-content">
          <div className="page-heading">
            <div>
              <div className="eyebrow">OVERVIEW</div>
              <h1>Inventory dashboard</h1>
              <p className="page-description">
                Track products, stock levels, and inventory value in one place.
              </p>
            </div>
            <button className="primary-button" onClick={openAddModal}>
              <span className="plus-icon">+</span> Add product
            </button>
          </div>

          {error && (
            <div className="alert error-alert" role="alert">
              <span>!</span>
              <div>
                <strong>Something needs your attention</strong>
                <p>{error}</p>
                <button className="text-button" onClick={loadProducts}>
                  Try again
                </button>
              </div>
            </div>
          )}

          {notice && !error && (
            <div className="alert success-alert" role="status">
              <span>✓</span> {notice}
              <button className="dismiss-button" onClick={() => setNotice('')} aria-label="Dismiss">
                ×
              </button>
            </div>
          )}

          <div className="stats-grid">
            <article className="stat-card">
              <div className="stat-top">
                <span className="stat-label">Active products</span>
                <span className="stat-icon purple">▤</span>
              </div>
              <div className="stat-value">{loading ? '—' : activeProducts.length}</div>
              <div className="stat-foot">Products currently active</div>
            </article>

            <article className="stat-card">
              <div className="stat-top">
                <span className="stat-label">Units in stock</span>
                <span className="stat-icon blue">▦</span>
              </div>
              <div className="stat-value">{loading ? '—' : totalUnits.toLocaleString('en-IN')}</div>
              <div className="stat-foot">Across active products</div>
            </article>

            <article className="stat-card">
              <div className="stat-top">
                <span className="stat-label">Inventory value</span>
                <span className="stat-icon green">₹</span>
              </div>
              <div className="stat-value stat-currency">
                {loading ? '—' : currency(inventoryValue)}
              </div>
              <div className="stat-foot">Price × quantity in stock</div>
            </article>

            <article className="stat-card">
              <div className="stat-top">
                <span className="stat-label">Low stock items</span>
                <span className="stat-icon orange">!</span>
              </div>
              <div className="stat-value">{loading ? '—' : lowStockCount}</div>
              <div className="stat-foot">10 units or fewer</div>
            </article>
          </div>

          <section className="products-panel" id="products">
            <div className="panel-heading">
              <div>
                <h2>All products</h2>
                <p>Manage and monitor your inventory.</p>
              </div>
              <button className="secondary-button" onClick={loadProducts} disabled={loading}>
                <span className={loading ? 'refresh-icon spinning' : 'refresh-icon'}>↻</span>
                Refresh
              </button>
            </div>

            <div className="table-toolbar">
              <label className="search-box">
                <span aria-hidden="true">⌕</span>
                <input
                  type="search"
                  value={search}
                  onChange={(event) => setSearch(event.target.value)}
                  placeholder="Search products by name or ID..."
                  aria-label="Search products by name or ID"
                />
              </label>
              <span className="result-count">
                {loading ? 'Loading…' : `${filteredProducts.length} product${filteredProducts.length === 1 ? '' : 's'}`}
              </span>
            </div>

            <div className="table-scroll">
              <table>
                <thead>
                  <tr>
                    <th>PRODUCT</th>
                    <th>PRODUCT ID</th>
                    <th>UNIT PRICE</th>
                    <th>STOCK LEVEL</th>
                    <th>STATUS</th>
                    <th className="actions-heading">ACTIONS</th>
                  </tr>
                </thead>
                <tbody>
                  {loading ? (
                    <tr>
                      <td colSpan="6" className="empty-state">
                        <span className="loader" />
                        Loading inventory…
                      </td>
                    </tr>
                  ) : filteredProducts.length === 0 ? (
                    <tr>
                      <td colSpan="6" className="empty-state">
                        <div className="empty-icon">▤</div>
                        <strong>{search ? 'No matching products' : 'No products yet'}</strong>
                        <p>{search ? 'Try another search term.' : 'Add your first product to get started.'}</p>
                        {!search && (
                          <button className="primary-button compact-button" onClick={openAddModal}>
                            + Add product
                          </button>
                        )}
                      </td>
                    </tr>
                  ) : (
                    filteredProducts.map((product) => {
                      const quantity = Number(product.stockQuantity || 0)
                      const isLowStock = quantity <= 10

                      return (
                        <tr key={product.id}>
                          <td>
                            <div className="product-cell">
                              <div className="product-avatar">
                                {String(product.name || '?').trim().charAt(0).toUpperCase()}
                              </div>
                              <div className="product-name">{product.name}</div>
                            </div>
                          </td>
                          <td><span className="id-label">#{product.id}</span></td>
                          <td className="price-cell">{currency(product.price)}</td>
                          <td>
                            <div className="stock-cell">
                              <span className={isLowStock ? 'stock-number low' : 'stock-number'}>
                                {quantity}
                              </span>
                              <span className="stock-unit">units</span>
                            </div>
                          </td>
                          <td>
                            {product.active === false ? (
                              <span className="status-badge inactive">
                                <span /> Inactive
                              </span>
                            ) : isLowStock ? (
                              <span className="status-badge low-status">
                                <span /> Low stock
                              </span>
                            ) : (
                              <span className="status-badge active-status">
                                <span /> In stock
                              </span>
                            )}
                          </td>
                          <td>
                            <div className="row-actions">
                              <button
                                className="icon-button"
                                title="Edit product"
                                aria-label={`Edit ${product.name}`}
                                onClick={() => openEditModal(product)}
                              >
                                ✎
                              </button>
                              <button
                                className="icon-button delete-button"
                                title="Delete product"
                                aria-label={`Delete ${product.name}`}
                                disabled={deletingId === product.id}
                                onClick={() => handleDelete(product)}
                              >
                                {deletingId === product.id ? '…' : '⌫'}
                              </button>
                            </div>
                          </td>
                        </tr>
                      )
                    })
                  )}
                </tbody>
              </table>
            </div>

            <div className="table-footer">
              <span>StockFlow Inventory Management</span>
              <span>{loading ? 'Syncing data…' : 'Data synced from your API'}</span>
            </div>
          </section>

          <footer className="page-footer">
            <span>StockFlow <span className="footer-dot">•</span> Inventory made clear.</span>
            <span>React + Spring Boot</span>
          </footer>
        </section>
      </main>

      {modalOpen && (
        <div
          className="modal-backdrop"
          onMouseDown={(event) => {
            if (event.target === event.currentTarget) closeModal()
          }}
        >
          <section className="product-modal" role="dialog" aria-modal="true" aria-labelledby="modal-title">
            <div className="modal-heading">
              <div>
                <div className="eyebrow">{editingProduct ? 'EDIT INVENTORY' : 'NEW INVENTORY ITEM'}</div>
                <h2 id="modal-title">{editingProduct ? 'Edit product' : 'Add a product'}</h2>
                <p>{editingProduct ? `Update product #${editingProduct.id}.` : 'Enter the details for your new product.'}</p>
              </div>
              <button className="dismiss-button modal-close" onClick={closeModal} disabled={saving} aria-label="Close dialog">
                ×
              </button>
            </div>

            <form onSubmit={handleSubmit}>
              <label className="form-field">
                <span>Product name <b>*</b></span>
                <input
                  name="name"
                  value={form.name}
                  onChange={updateForm}
                  placeholder="e.g. Wireless Keyboard"
                  maxLength={150}
                  required
                  autoFocus
                />
              </label>

              <div className="form-row">
                <label className="form-field">
                  <span>Unit price (₹) <b>*</b></span>
                  <input
                    name="price"
                    type="number"
                    value={form.price}
                    onChange={updateForm}
                    placeholder="0.00"
                    min="0"
                    step="0.01"
                    required
                  />
                </label>
                <label className="form-field">
                  <span>Stock quantity <b>*</b></span>
                  <input
                    name="stockQuantity"
                    type="number"
                    value={form.stockQuantity}
                    onChange={updateForm}
                    placeholder="0"
                    min="0"
                    step="1"
                    required
                  />
                </label>
              </div>

              {error && <div className="form-error" role="alert">{error}</div>}

              <div className="modal-actions">
                <button type="button" className="secondary-button" onClick={closeModal} disabled={saving}>
                  Cancel
                </button>
                <button type="submit" className="primary-button" disabled={saving}>
                  {saving ? 'Saving…' : editingProduct ? 'Save changes' : 'Create product'}
                </button>
              </div>
            </form>
          </section>
        </div>
      )}
    </div>
  )
}

export default App
