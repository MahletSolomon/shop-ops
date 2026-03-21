package tests

import (
	"context"
	"testing"
	"time"

	domain "shop-ops/Domain"
	repositories "shop-ops/Repositories"
	usecases "shop-ops/Usecases"

	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/mock"
)

// --- Mock ---

type MockSyncRepository struct {
	mock.Mock
}

func (m *MockSyncRepository) ProcessBatch(ctx context.Context, req domain.SyncBatchRequest) (*domain.SyncBatchResponse, error) {
	args := m.Called(ctx, req)
	if args.Get(0) == nil {
		return nil, args.Error(1)
	}
	return args.Get(0).(*domain.SyncBatchResponse), args.Error(1)
}

func (m *MockSyncRepository) GetStatus(ctx context.Context, businessID, deviceID string) (*domain.SyncStatusResponse, error) {
	args := m.Called(ctx, businessID, deviceID)
	if args.Get(0) == nil {
		return nil, args.Error(1)
	}
	return args.Get(0).(*domain.SyncStatusResponse), args.Error(1)
}

func (m *MockSyncRepository) GetHistory(ctx context.Context, businessID string, page, limit int) (*domain.SyncHistoryResponse, error) {
	args := m.Called(ctx, businessID, page, limit)
	if args.Get(0) == nil {
		return nil, args.Error(1)
	}
	return args.Get(0).(*domain.SyncHistoryResponse), args.Error(1)
}

// Compile-time interface check
var _ repositories.SyncRepository = (*MockSyncRepository)(nil)

// --- SyncBatch Tests ---

func TestSyncBatch_EmptyBusinessID(t *testing.T) {
	mockRepo := new(MockSyncRepository)
	uc := usecases.NewSyncUseCases(mockRepo)

	req := domain.SyncBatchRequest{
		BusinessID: "",
		DeviceID:   "device_1",
		Transactions: []domain.SyncBatchTransaction{
			{LocalID: "l1", Type: domain.SyncTransactionTypeSale, Data: map[string]interface{}{}},
		},
	}

	result, err := uc.SyncBatch(req)

	assert.Nil(t, result)
	assert.Error(t, err)
	assert.Equal(t, "business_id is required", err.Error())
	mockRepo.AssertNotCalled(t, "ProcessBatch")
}

func TestSyncBatch_EmptyDeviceID(t *testing.T) {
	mockRepo := new(MockSyncRepository)
	uc := usecases.NewSyncUseCases(mockRepo)

	req := domain.SyncBatchRequest{
		BusinessID: "biz_123",
		DeviceID:   "",
		Transactions: []domain.SyncBatchTransaction{
			{LocalID: "l1", Type: domain.SyncTransactionTypeSale, Data: map[string]interface{}{}},
		},
	}

	result, err := uc.SyncBatch(req)

	assert.Nil(t, result)
	assert.Error(t, err)
	assert.Equal(t, "device_id is required", err.Error())
	mockRepo.AssertNotCalled(t, "ProcessBatch")
}

func TestSyncBatch_EmptyTransactions(t *testing.T) {
	mockRepo := new(MockSyncRepository)
	uc := usecases.NewSyncUseCases(mockRepo)

	req := domain.SyncBatchRequest{
		BusinessID:   "biz_123",
		DeviceID:     "device_1",
		Transactions: []domain.SyncBatchTransaction{},
	}

	result, err := uc.SyncBatch(req)

	assert.Nil(t, result)
	assert.Error(t, err)
	assert.Equal(t, "transactions cannot be empty", err.Error())
	mockRepo.AssertNotCalled(t, "ProcessBatch")
}

func TestSyncBatch_ExceedsMaxBatchSize(t *testing.T) {
	mockRepo := new(MockSyncRepository)
	uc := usecases.NewSyncUseCases(mockRepo)

	txns := make([]domain.SyncBatchTransaction, 1001)
	for i := range txns {
		txns[i] = domain.SyncBatchTransaction{
			LocalID: "local_" + string(rune('a'+i%26)) + "_" + time.Now().Format("150405"),
			Type:    domain.SyncTransactionTypeSale,
			Data:    map[string]interface{}{},
		}
	}
	// Ensure unique local IDs by using index
	for i := range txns {
		txns[i].LocalID = "local_" + itoa(i)
	}

	req := domain.SyncBatchRequest{
		BusinessID:   "biz_123",
		DeviceID:     "device_1",
		Transactions: txns,
	}

	result, err := uc.SyncBatch(req)

	assert.Nil(t, result)
	assert.Error(t, err)
	assert.Equal(t, "maximum 1000 transactions per sync batch", err.Error())
	mockRepo.AssertNotCalled(t, "ProcessBatch")
}

func TestSyncBatch_DuplicateLocalID(t *testing.T) {
	mockRepo := new(MockSyncRepository)
	uc := usecases.NewSyncUseCases(mockRepo)

	req := domain.SyncBatchRequest{
		BusinessID: "biz_123",
		DeviceID:   "device_1",
		Transactions: []domain.SyncBatchTransaction{
			{LocalID: "dup_id", Type: domain.SyncTransactionTypeSale, Data: map[string]interface{}{}},
			{LocalID: "dup_id", Type: domain.SyncTransactionTypeExpense, Data: map[string]interface{}{}},
		},
	}

	result, err := uc.SyncBatch(req)

	assert.Nil(t, result)
	assert.Error(t, err)
	assert.Contains(t, err.Error(), "duplicate local_id in batch")
	mockRepo.AssertNotCalled(t, "ProcessBatch")
}

func TestSyncBatch_InvalidTransactionType(t *testing.T) {
	mockRepo := new(MockSyncRepository)
	uc := usecases.NewSyncUseCases(mockRepo)

	req := domain.SyncBatchRequest{
		BusinessID: "biz_123",
		DeviceID:   "device_1",
		Transactions: []domain.SyncBatchTransaction{
			{LocalID: "l1", Type: "invalid_type", Data: map[string]interface{}{}},
		},
	}

	result, err := uc.SyncBatch(req)

	assert.Nil(t, result)
	assert.Error(t, err)
	assert.Equal(t, "transaction type must be sale or expense", err.Error())
	mockRepo.AssertNotCalled(t, "ProcessBatch")
}

func TestSyncBatch_EmptyLocalID(t *testing.T) {
	mockRepo := new(MockSyncRepository)
	uc := usecases.NewSyncUseCases(mockRepo)

	req := domain.SyncBatchRequest{
		BusinessID: "biz_123",
		DeviceID:   "device_1",
		Transactions: []domain.SyncBatchTransaction{
			{LocalID: "", Type: domain.SyncTransactionTypeSale, Data: map[string]interface{}{}},
		},
	}

	result, err := uc.SyncBatch(req)

	assert.Nil(t, result)
	assert.Error(t, err)
	assert.Equal(t, "local_id is required for all transactions", err.Error())
	mockRepo.AssertNotCalled(t, "ProcessBatch")
}

func TestSyncBatch_ValidRequest(t *testing.T) {
	mockRepo := new(MockSyncRepository)
	uc := usecases.NewSyncUseCases(mockRepo)

	req := domain.SyncBatchRequest{
		BusinessID: "biz_123",
		DeviceID:   "device_1",
		Transactions: []domain.SyncBatchTransaction{
			{LocalID: "local_001", Type: domain.SyncTransactionTypeSale, Data: map[string]interface{}{"amount": 1500.0}},
			{LocalID: "local_002", Type: domain.SyncTransactionTypeExpense, Data: map[string]interface{}{"amount": 500.0}},
		},
	}

	expectedResp := &domain.SyncBatchResponse{
		SyncID:    "sync_abc",
		Status:    "completed",
		Timestamp: time.Now().UTC(),
		Results: []domain.SyncItemResult{
			{LocalID: "local_001", ServerID: "sale_456", Status: "success"},
			{LocalID: "local_002", ServerID: "expense_789", Status: "success"},
		},
		Summary: domain.SyncSummary{Total: 2, Success: 2, Failed: 0},
	}

	mockRepo.On("ProcessBatch", mock.Anything, req).Return(expectedResp, nil).Once()

	result, err := uc.SyncBatch(req)

	assert.NoError(t, err)
	assert.NotNil(t, result)
	assert.Equal(t, "sync_abc", result.SyncID)
	assert.Equal(t, 2, result.Summary.Total)
	assert.Equal(t, 2, result.Summary.Success)
	assert.Equal(t, 0, result.Summary.Failed)
	mockRepo.AssertExpectations(t)
}

// --- GetStatus Tests ---

func TestGetStatus_EmptyBusinessID(t *testing.T) {
	mockRepo := new(MockSyncRepository)
	uc := usecases.NewSyncUseCases(mockRepo)

	result, err := uc.GetStatus("", "device_1")

	assert.Nil(t, result)
	assert.Error(t, err)
	assert.Equal(t, "business_id is required", err.Error())
	mockRepo.AssertNotCalled(t, "GetStatus")
}

func TestGetStatus_ValidRequest(t *testing.T) {
	mockRepo := new(MockSyncRepository)
	uc := usecases.NewSyncUseCases(mockRepo)

	expectedResp := &domain.SyncStatusResponse{
		BusinessID:     "biz_123",
		DeviceID:       "device_1",
		LastSyncAt:     time.Now().UTC(),
		LastSyncID:     "sync_abc",
		LastStatus:     "completed",
		PendingRetries: 0,
		TotalSynced:    42,
		FailedLast24h:  1,
	}

	mockRepo.On("GetStatus", mock.Anything, "biz_123", "device_1").Return(expectedResp, nil).Once()

	result, err := uc.GetStatus("biz_123", "device_1")

	assert.NoError(t, err)
	assert.NotNil(t, result)
	assert.Equal(t, "biz_123", result.BusinessID)
	assert.Equal(t, int64(42), result.TotalSynced)
	mockRepo.AssertExpectations(t)
}

// --- GetHistory Tests ---

func TestGetHistory_EmptyBusinessID(t *testing.T) {
	mockRepo := new(MockSyncRepository)
	uc := usecases.NewSyncUseCases(mockRepo)

	result, err := uc.GetHistory("", 1, 20)

	assert.Nil(t, result)
	assert.Error(t, err)
	assert.Equal(t, "business_id is required", err.Error())
	mockRepo.AssertNotCalled(t, "GetHistory")
}

func TestGetHistory_NormalizesPageAndLimit(t *testing.T) {
	mockRepo := new(MockSyncRepository)
	uc := usecases.NewSyncUseCases(mockRepo)

	expectedResp := &domain.SyncHistoryResponse{
		Data: []domain.SyncLog{},
	}

	// page < 1 should be normalized to 1, limit < 1 should be normalized to 20
	mockRepo.On("GetHistory", mock.Anything, "biz_123", 1, 20).Return(expectedResp, nil).Once()

	result, err := uc.GetHistory("biz_123", -5, 0)

	assert.NoError(t, err)
	assert.NotNil(t, result)
	mockRepo.AssertExpectations(t)
}

func TestGetHistory_CapsLimitAt100(t *testing.T) {
	mockRepo := new(MockSyncRepository)
	uc := usecases.NewSyncUseCases(mockRepo)

	expectedResp := &domain.SyncHistoryResponse{
		Data: []domain.SyncLog{},
	}

	// limit > 100 should be capped to 100
	mockRepo.On("GetHistory", mock.Anything, "biz_123", 1, 100).Return(expectedResp, nil).Once()

	result, err := uc.GetHistory("biz_123", 1, 500)

	assert.NoError(t, err)
	assert.NotNil(t, result)
	mockRepo.AssertExpectations(t)
}

// --- Helpers ---

func itoa(n int) string {
	if n == 0 {
		return "0"
	}
	s := ""
	for n > 0 {
		s = string(rune('0'+n%10)) + s
		n /= 10
	}
	return s
}
