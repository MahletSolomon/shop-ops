package usecases

import (
	"context"
	"errors"
	domain "shop-ops/Domain"
	repositories "shop-ops/Repositories"
	"strings"
)

const maxSyncBatchSize = 1000

// SyncUseCases orchestrates sync business logic.
type SyncUseCases struct {
	syncRepo repositories.SyncRepository
}

// NewSyncUseCases creates a new sync use case service.
func NewSyncUseCases(syncRepo repositories.SyncRepository) *SyncUseCases {
	return &SyncUseCases{syncRepo: syncRepo}
}

// SyncBatch validates and processes a sync batch.
func (uc *SyncUseCases) SyncBatch(req domain.SyncBatchRequest) (*domain.SyncBatchResponse, error) {
	if strings.TrimSpace(req.BusinessID) == "" {
		return nil, errors.New("business_id is required")
	}
	if strings.TrimSpace(req.DeviceID) == "" {
		return nil, errors.New("device_id is required")
	}
	if len(req.Transactions) == 0 {
		return nil, errors.New("transactions cannot be empty")
	}
	if len(req.Transactions) > maxSyncBatchSize {
		return nil, errors.New("maximum 1000 transactions per sync batch")
	}

	seenLocalIDs := make(map[string]struct{}, len(req.Transactions))
	for _, tx := range req.Transactions {
		localID := strings.TrimSpace(tx.LocalID)
		if localID == "" {
			return nil, errors.New("local_id is required for all transactions")
		}
		if _, exists := seenLocalIDs[localID]; exists {
			return nil, errors.New("duplicate local_id in batch: " + localID)
		}
		seenLocalIDs[localID] = struct{}{}
		if tx.Type != domain.SyncTransactionTypeSale && tx.Type != domain.SyncTransactionTypeExpense {
			return nil, errors.New("transaction type must be sale or expense")
		}
	}

	return uc.syncRepo.ProcessBatch(context.Background(), req)
}

// GetStatus fetches current sync status for a business.
func (uc *SyncUseCases) GetStatus(businessID, deviceID string) (*domain.SyncStatusResponse, error) {
	if strings.TrimSpace(businessID) == "" {
		return nil, errors.New("business_id is required")
	}
	return uc.syncRepo.GetStatus(context.Background(), businessID, deviceID)
}

// GetHistory fetches sync logs for a business with pagination.
func (uc *SyncUseCases) GetHistory(businessID string, page, limit int) (*domain.SyncHistoryResponse, error) {
	if strings.TrimSpace(businessID) == "" {
		return nil, errors.New("business_id is required")
	}
	if page < 1 {
		page = 1
	}
	if limit < 1 {
		limit = 20
	}
	if limit > 100 {
		limit = 100
	}
	return uc.syncRepo.GetHistory(context.Background(), businessID, page, limit)
}
