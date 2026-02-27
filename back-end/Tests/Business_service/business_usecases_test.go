package tests

import (
	"testing"
	"time"

	domain "shop-ops/Domain"
	usecases "shop-ops/Usecases"

	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/mock"
	"go.mongodb.org/mongo-driver/bson/primitive"
)

// --- Mocks ---

type MockBusinessRepository struct {
	mock.Mock
}

func (m *MockBusinessRepository) Save(business *domain.Business) error {
	args := m.Called(business)
	return args.Error(0)
}

func (m *MockBusinessRepository) FindByID(id string) (*domain.Business, error) {
	args := m.Called(id)
	if args.Get(0) == nil {
		return nil, args.Error(1)
	}
	return args.Get(0).(*domain.Business), args.Error(1)
}

func (m *MockBusinessRepository) FindByUserId(userId string) ([]*domain.Business, error) {
	args := m.Called(userId)
	if args.Get(0) == nil {
		return nil, args.Error(1)
	}
	return args.Get(0).([]*domain.Business), args.Error(1)
}

func (m *MockBusinessRepository) Update(business *domain.Business) error {
	args := m.Called(business)
	return args.Error(0)
}

func (m *MockBusinessRepository) FindByNameAndUserId(name string, userId string) (*domain.Business, error) {
	args := m.Called(name, userId)
	if args.Get(0) == nil {
		return nil, args.Error(1)
	}
	return args.Get(0).(*domain.Business), args.Error(1)
}

// --- Tests ---

func TestCreateBusiness(t *testing.T) {
	mockRepo := new(MockBusinessRepository)
	uc := usecases.NewBusinessUseCases(mockRepo)

	userID := primitive.NewObjectID().Hex()
	req := &usecases.CreateBusinessRequest{
		Name:     "Test Shop",
		Currency: "USD",
		Language: "en",
	}

	t.Run("Success", func(t *testing.T) {
		mockRepo.On("FindByNameAndUserId", req.Name, userID).Return(nil, nil).Once()
		mockRepo.On("Save", mock.MatchedBy(func(b *domain.Business) bool {
			return b.Name == req.Name && b.Currency == req.Currency && b.UserID.Hex() == userID
		})).Return(nil).Once()

		business, err := uc.Create(userID, req)

		assert.NoError(t, err)
		assert.NotNil(t, business)
		assert.Equal(t, req.Name, business.Name)
		mockRepo.AssertExpectations(t)
	})

	t.Run("Duplicate Name", func(t *testing.T) {
		existing := &domain.Business{Name: req.Name}
		mockRepo.On("FindByNameAndUserId", req.Name, userID).Return(existing, nil).Once()

		business, err := uc.Create(userID, req)

		assert.Error(t, err)
		assert.Nil(t, business)
		assert.Contains(t, err.Error(), "business with this name already exists")
		mockRepo.AssertExpectations(t)
	})

	t.Run("Invalid User ID", func(t *testing.T) {
		business, err := uc.Create("invalid_hex", req)

		assert.Error(t, err)
		assert.Nil(t, business)
		assert.Equal(t, "invalid user id", err.Error())
	})
}

func TestGetBusinessById(t *testing.T) {
	mockRepo := new(MockBusinessRepository)
	uc := usecases.NewBusinessUseCases(mockRepo)

	businessID := primitive.NewObjectID().Hex()
	business := &domain.Business{Name: "Test Shop"}

	t.Run("Success", func(t *testing.T) {
		mockRepo.On("FindByID", businessID).Return(business, nil).Once()

		result, err := uc.GetById(businessID)

		assert.NoError(t, err)
		assert.Equal(t, business, result)
		mockRepo.AssertExpectations(t)
	})

	t.Run("Not Found", func(t *testing.T) {
		mockRepo.On("FindByID", businessID).Return(nil, nil).Once()

		result, err := uc.GetById(businessID)

		assert.NoError(t, err)
		assert.Nil(t, result)
		mockRepo.AssertExpectations(t)
	})
}

func TestUpdateBusiness(t *testing.T) {
	mockRepo := new(MockBusinessRepository)
	uc := usecases.NewBusinessUseCases(mockRepo)

	userID := primitive.NewObjectID()
	otherUserID := primitive.NewObjectID()
	businessID := primitive.NewObjectID().Hex()

	req := &usecases.UpdateBusinessRequest{
		Name: "New Name",
	}

	t.Run("Success", func(t *testing.T) {
		// Create fresh business object
		business := &domain.Business{
			ID:        primitive.NewObjectID(),
			UserID:    userID,
			Name:      "Old Name",
			UpdatedAt: time.Time{},
		}

		mockRepo.On("FindByID", businessID).Return(business, nil).Once()
		mockRepo.On("FindByNameAndUserId", req.Name, userID.Hex()).Return(nil, nil).Once()
		mockRepo.On("Update", mock.MatchedBy(func(b *domain.Business) bool {
			return b.Name == req.Name && !b.UpdatedAt.IsZero()
		})).Return(nil).Once()

		updatedBusiness, err := uc.Update(businessID, userID.Hex(), req)

		assert.NoError(t, err)
		assert.Equal(t, req.Name, updatedBusiness.Name)
		mockRepo.AssertExpectations(t)
	})

	t.Run("Duplicate Name", func(t *testing.T) {
		business := &domain.Business{
			ID:     primitive.NewObjectID(),
			UserID: userID,
			Name:   "Old Name",
		}

		existing := &domain.Business{
			ID:   primitive.NewObjectID(),
			Name: req.Name,
		}
		mockRepo.On("FindByID", businessID).Return(business, nil).Once()
		mockRepo.On("FindByNameAndUserId", req.Name, userID.Hex()).Return(existing, nil).Once()

		updatedBusiness, err := uc.Update(businessID, userID.Hex(), req)

		assert.Error(t, err)
		assert.Nil(t, updatedBusiness)
		assert.Equal(t, "business with this name already exists", err.Error())
		mockRepo.AssertExpectations(t)
	})

	t.Run("Not Found", func(t *testing.T) {
		mockRepo.On("FindByID", businessID).Return(nil, nil).Once()

		updatedBusiness, err := uc.Update(businessID, userID.Hex(), req)

		assert.Error(t, err)
		assert.Nil(t, updatedBusiness)
		assert.Equal(t, "business not found", err.Error())
		mockRepo.AssertExpectations(t)
	})

	t.Run("Unauthorized", func(t *testing.T) {
		business := &domain.Business{
			ID:     primitive.NewObjectID(),
			UserID: userID,
			Name:   "Old Name",
		}

		mockRepo.On("FindByID", businessID).Return(business, nil).Once()

		updatedBusiness, err := uc.Update(businessID, otherUserID.Hex(), req)

		assert.Error(t, err)
		assert.Nil(t, updatedBusiness)
		assert.Equal(t, "unauthorized", err.Error())
		mockRepo.AssertExpectations(t)
	})
}
