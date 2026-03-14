package tests

import (
	"context"
	"testing"
	"time"

	Domain "shop-ops/Domain"
	Repositories "shop-ops/Repositories"
	usecases "shop-ops/Usecases"

	"github.com/shopspring/decimal"
	"github.com/stretchr/testify/assert"
	"go.mongodb.org/mongo-driver/bson/primitive"
)

// MockExportRepository implements Domain.ExportRepository for testing
type MockExportRepository struct {
	requests map[string]*Domain.ExportRequest
}

func NewMockExportRepository() *MockExportRepository {
	return &MockExportRepository{
		requests: make(map[string]*Domain.ExportRequest),
	}
}

func (m *MockExportRepository) Create(request *Domain.ExportRequest) error {
	request.ID = primitive.NewObjectID().Hex()
	request.CreatedAt = time.Now()
	request.UpdatedAt = time.Now()
	m.requests[request.ID] = request
	return nil
}

func (m *MockExportRepository) GetByID(id, businessID string) (*Domain.ExportRequest, error) {
	req, ok := m.requests[id]
	if !ok || req.BusinessID != businessID {
		return nil, nil
	}
	return req, nil
}

func (m *MockExportRepository) GetByBusiness(businessID string, limit, offset int) ([]Domain.ExportRequest, error) {
	var result []Domain.ExportRequest
	for _, req := range m.requests {
		if req.BusinessID == businessID {
			result = append(result, *req)
		}
	}
	return result, nil
}

func (m *MockExportRepository) CountByBusiness(businessID string) (int64, error) {
	count := 0
	for _, req := range m.requests {
		if req.BusinessID == businessID {
			count++
		}
	}
	return int64(count), nil
}

func (m *MockExportRepository) UpdateStatus(id string, status Domain.ExportStatus, fileURL, errorMessage string) error {
	if req, ok := m.requests[id]; ok {
		req.Status = status
		req.FileURL = fileURL
		req.Error = errorMessage
		req.UpdatedAt = time.Now()
	}
	return nil
}

// Minimal mock transaction repo simply to resolve Usecase instantiation
type MockTransactionRepo struct{}

func (m *MockTransactionRepo) GetTransactions(ctx context.Context, filter Domain.TransactionFilter) (*Domain.TransactionList, error) {
	return &Domain.TransactionList{}, nil
}

// Minimal mock sales repo
type MockSalesRepo struct{}

func (m *MockSalesRepo) Create(sale *Domain.Sale) error           { return nil }
func (m *MockSalesRepo) FindByID(id string) (*Domain.Sale, error) { return nil, nil }
func (m *MockSalesRepo) FindByBusinessID(businessID string, query Domain.SaleListQuery) ([]Domain.Sale, int64, error) {
	return []Domain.Sale{}, 0, nil
}
func (m *MockSalesRepo) FindAllByBusinessID(businessID string) ([]Domain.Sale, error) {
	return []Domain.Sale{}, nil
}
func (m *MockSalesRepo) Update(sale *Domain.Sale) error          { return nil }
func (m *MockSalesRepo) UpdateNote(id string, note string) error { return nil }
func (m *MockSalesRepo) Delete(id string) error                  { return nil }
func (m *MockSalesRepo) VoidSale(id string) error                { return nil }
func (m *MockSalesRepo) FindSince(businessID string, since time.Time) ([]Domain.Sale, error) {
	return []Domain.Sale{}, nil
}
func (m *MockSalesRepo) GetSummary(businessID string, startDate, endDate time.Time) (*Domain.SaleSummaryResponse, error) {
	return &Domain.SaleSummaryResponse{}, nil
}

// Minimal mock product repo
type MockProductRepo struct{}

func (m *MockProductRepo) Create(product *Domain.Product) error        { return nil }
func (m *MockProductRepo) FindByID(id string) (*Domain.Product, error) { return nil, nil }
func (m *MockProductRepo) FindByBusinessID(businessID string, query Domain.ProductListQuery) ([]Domain.Product, int64, error) {
	return []Domain.Product{}, 0, nil
}
func (m *MockProductRepo) FindAllByBusinessID(businessID string) ([]Domain.Product, error) {
	return []Domain.Product{}, nil
}
func (m *MockProductRepo) FindSince(businessID string, since time.Time) ([]Domain.Product, error) {
	return []Domain.Product{}, nil
}
func (m *MockProductRepo) Update(product *Domain.Product) error { return nil }
func (m *MockProductRepo) Delete(id string) error               { return nil }
func (m *MockProductRepo) AdjustStock(productID string, quantity int, movementType Domain.MovementType, reason string, referenceID *string, userID string) error {
	return nil
}
func (m *MockProductRepo) GetLowStock(businessID string) ([]Domain.Product, error) {
	return []Domain.Product{}, nil
}
func (m *MockProductRepo) GetStockHistory(productID string, limit int) ([]Domain.StockMovement, error) {
	return []Domain.StockMovement{}, nil
}

// Minimal mock expense repo
type MockExpenseRepo struct{}

func (m *MockExpenseRepo) Create(ctx context.Context, expense *Domain.Expense) error { return nil }
func (m *MockExpenseRepo) GetByID(ctx context.Context, id primitive.ObjectID) (*Domain.Expense, error) {
	return nil, nil
}
func (m *MockExpenseRepo) GetByBusinessID(ctx context.Context, filter Repositories.ExpenseFilter) ([]*Domain.Expense, int64, error) {
	return []*Domain.Expense{}, 0, nil
}
func (m *MockExpenseRepo) GetAllByBusinessID(ctx context.Context, businessID primitive.ObjectID) ([]*Domain.Expense, error) {
	return []*Domain.Expense{}, nil
}
func (m *MockExpenseRepo) GetSince(ctx context.Context, businessID primitive.ObjectID, since time.Time) ([]*Domain.Expense, error) {
	return []*Domain.Expense{}, nil
}
func (m *MockExpenseRepo) Update(ctx context.Context, expense *Domain.Expense) error { return nil }
func (m *MockExpenseRepo) Void(ctx context.Context, id primitive.ObjectID) error     { return nil }
func (m *MockExpenseRepo) GetSummaryByCategory(ctx context.Context, businessID primitive.ObjectID, startDate, endDate *time.Time) (map[Domain.ExpenseCategory]decimal.Decimal, decimal.Decimal, error) {
	return nil, decimal.Decimal{}, nil
}

func TestExportUsecases_RequestExport(t *testing.T) {
	mockExportRepo := NewMockExportRepository()
	uc := usecases.NewExportUsecases(mockExportRepo, nil, &MockSalesRepo{}, &MockProductRepo{}, &MockExpenseRepo{}, &MockTransactionRepo{})

	businessID := primitive.NewObjectID().Hex()
	userID := primitive.NewObjectID().Hex()
	filters := map[string]interface{}{"start_date": "2024-01-01"}
	fields := []string{"amount", "date"}

	t.Run("Valid sales export", func(t *testing.T) {
		req, err := uc.RequestExport(businessID, userID, "sales", "csv", filters, fields)
		assert.NoError(t, err)
		assert.NotNil(t, req)
	})

	t.Run("Valid inventory export", func(t *testing.T) {
		inventoryFilters := map[string]interface{}{
			"search":         "milk",
			"low_stock_only": true,
		}
		req, err := uc.RequestExport(businessID, userID, "inventory", "csv", inventoryFilters, nil)
		assert.NoError(t, err)
		assert.NotNil(t, req)
	})

	t.Run("Valid profit export", func(t *testing.T) {
		profitFilters := map[string]interface{}{
			"start_date": "2024-01-01",
			"end_date":   "2024-01-31",
		}
		req, err := uc.RequestExport(businessID, userID, "profit", "csv", profitFilters, nil)
		assert.NoError(t, err)
		assert.NotNil(t, req)
	})
}

func TestExportUsecases_GetExportStatus(t *testing.T) {
	mockExportRepo := NewMockExportRepository()
	uc := usecases.NewExportUsecases(mockExportRepo, nil, &MockSalesRepo{}, &MockProductRepo{}, &MockExpenseRepo{}, &MockTransactionRepo{})

	businessID := primitive.NewObjectID().Hex()
	userID := primitive.NewObjectID().Hex()

	req, _ := uc.RequestExport(businessID, userID, "expenses", "csv", nil, nil)

	t.Run("Get existing request", func(t *testing.T) {
		fetched, err := uc.GetExportStatus(req.ID, businessID)
		assert.NoError(t, err)
		assert.NotNil(t, fetched)
		assert.Equal(t, req.ID, fetched.ID)
	})

	t.Run("Get with wrong business ID", func(t *testing.T) {
		fetched, err := uc.GetExportStatus(req.ID, primitive.NewObjectID().Hex())
		assert.NoError(t, err)
		assert.Nil(t, fetched)
	})

	t.Run("Get non-existent request", func(t *testing.T) {
		fetched, err := uc.GetExportStatus("fake-id", businessID)
		assert.NoError(t, err)
		assert.Nil(t, fetched)
	})
}
