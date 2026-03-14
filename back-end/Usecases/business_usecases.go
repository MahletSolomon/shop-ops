package usecases

import (
	"errors"
	"time"

	domain "shop-ops/Domain"
	repositories "shop-ops/Repositories"

	"go.mongodb.org/mongo-driver/bson/primitive"
)

type CreateBusinessRequest struct {
	Name     string `json:"name"`
	Currency string `json:"currency"`
	Language string `json:"language"`
	Timezone string `json:"timezone"`
}

type UpdateBusinessRequest struct {
	Name     string `json:"name"`
	Currency string `json:"currency"`
	Language string `json:"language"`
}

type BusinessUseCases interface {
	Create(userId string, req *CreateBusinessRequest) (*domain.Business, error)
	GetByUserId(userId string) ([]*domain.Business, error)
	GetById(businessId string) (*domain.Business, error)
	Update(businessId string, userId string, req *UpdateBusinessRequest) (*domain.Business, error)
}

type businessUseCases struct {
	businessRepo repositories.BusinessRepository
}

func NewBusinessUseCases(businessRepo repositories.BusinessRepository) BusinessUseCases {
	return &businessUseCases{
		businessRepo: businessRepo,
	}
}

func (b *businessUseCases) Create(userId string, req *CreateBusinessRequest) (*domain.Business, error) {
	uID, err := primitive.ObjectIDFromHex(userId)
	if err != nil {
		return nil, errors.New("invalid user id")
	}

	// Check if business with same name already exists for this user
	existing, _ := b.businessRepo.FindByNameAndUserId(req.Name, userId)
	if existing != nil {
		return nil, errors.New("business with this name already exists")
	}

	business := domain.NewBusiness(uID, req.Name, req.Currency, req.Language, req.Timezone)
	if err := business.Validate(); err != nil {
		return nil, err
	}

	if err := b.businessRepo.Save(business); err != nil {
		return nil, err
	}

	return business, nil
}

func (b *businessUseCases) GetByUserId(userId string) ([]*domain.Business, error) {
	return b.businessRepo.FindByUserId(userId)
}

func (b *businessUseCases) GetById(businessId string) (*domain.Business, error) {
	return b.businessRepo.FindByID(businessId)
}

func (b *businessUseCases) Update(businessId string, userId string, req *UpdateBusinessRequest) (*domain.Business, error) {
	business, err := b.businessRepo.FindByID(businessId)
	if err != nil {
		return nil, err
	}
	if business == nil {
		return nil, errors.New("business not found")
	}

	// Verify ownership
	if business.UserID.Hex() != userId {
		return nil, errors.New("unauthorized")
	}

	if req.Name != "" {
		if req.Name != business.Name {
			// Check if another business with same name already exists for this user
			existing, _ := b.businessRepo.FindByNameAndUserId(req.Name, userId)
			if existing != nil && existing.ID != business.ID {
				return nil, errors.New("business with this name already exists")
			}
		}
		business.Name = req.Name
	}
	if req.Currency != "" {
		business.Currency = req.Currency
	}
	if req.Language != "" {
		business.Language = req.Language
	}
	business.UpdatedAt = time.Now()

	if err := b.businessRepo.Update(business); err != nil {
		return nil, err
	}

	return business, nil
}
