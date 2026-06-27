package profile

import (
	"context"
	"fmt"

	"github.com/jackc/pgx/v5"
	"github.com/jackc/pgx/v5/pgxpool"
	"github.com/minhvq36/focus-flow/backend/internal/economy"
	"github.com/minhvq36/focus-flow/backend/pkg/apperr"
	"github.com/minhvq36/focus-flow/backend/pkg/logger"
	"github.com/minhvq36/focus-flow/backend/pkg/profanity"
)

const (
	MaxFreeNameChanges = 2
	NameChangeCost     = 100000 // Silver
)

type RepositoryInterface interface {
	GetProfileByID(ctx context.Context, userID string) (*Profile, error)
	UpdateProfile(ctx context.Context, userID string, params UpdateProfileParams) (*Profile, error)
	GetNameChangeCount(ctx context.Context, userID string) (int, error)
	UpdateNameAndCount(ctx context.Context, tx pgx.Tx, userID, newName string) error
}

type EconomyManager interface {
	ChangeBalance(ctx context.Context, tx pgx.Tx, userID string, silverChange, goldChange int, actionType, referenceID, description string) (*economy.UserWallet, error)
}

type Service struct {
	db              *pgxpool.Pool
	repo            RepositoryInterface
	economyMgr      EconomyManager
	profanityFilter *profanity.Filter
	log             *logger.Logger
}

func NewService(db *pgxpool.Pool, repo RepositoryInterface, economyMgr EconomyManager, pf *profanity.Filter, log *logger.Logger) *Service {
	return &Service{
		db:              db,
		repo:            repo,
		economyMgr:      economyMgr,
		profanityFilter: pf,
		log:             log,
	}
}

func (s *Service) GetProfile(ctx context.Context, userID string) (*Profile, error) {
	profile, err := s.repo.GetProfileByID(ctx, userID)
	if err != nil {
		return nil, err
	}
	return profile, nil
}

func (s *Service) UpdateProfile(ctx context.Context, userID string, params UpdateProfileParams) (*Profile, error) {
	if params.Bio != nil {
		if err := s.checkProfanity(*params.Bio); err != nil {
			return nil, &apperr.ValidationError{Message: err.Error()}
		}
	}
	profile, err := s.repo.UpdateProfile(ctx, userID, params)
	if err != nil {
		return nil, err
	}
	s.log.Info("Profile updated", "user_id", userID)
	return profile, nil
}

func (s *Service) ChangeDisplayName(ctx context.Context, userID string, params ChangeNameParams) error {
	if err := s.checkProfanity(params.DisplayName); err != nil {
		return &apperr.ValidationError{Message: err.Error()}
	}

	changeCount, err := s.repo.GetNameChangeCount(ctx, userID)
	if err != nil {
		return fmt.Errorf("failed to get name change count: %w", err)
	}

	tx, err := s.db.Begin(ctx)
	if err != nil {
		return fmt.Errorf("ChangeDisplayName begin tx: %w", err)
	}
	defer tx.Rollback(ctx)

	if changeCount >= MaxFreeNameChanges {
		desc := fmt.Sprintf("changing name fee %d", changeCount+1)
		_, err = s.economyMgr.ChangeBalance(ctx, tx, userID, -NameChangeCost, 0, "name_change", "", desc)
		if err != nil {
			return err
		}
	}

	if err := s.repo.UpdateNameAndCount(ctx, tx, userID, params.DisplayName); err != nil {
		return fmt.Errorf("failed to update display name: %w", err)
	}

	// 6. Commit transaction
	if err := tx.Commit(ctx); err != nil {
		return fmt.Errorf("ChangeDisplayName commit: %w", err)
	}

	s.log.Info("Display name changed successfully", "user_id", userID, "new_name", params.DisplayName)
	return nil
}

func (s *Service) checkProfanity(text string) error {
	if s.profanityFilter.IsProfane(text) {
		return fmt.Errorf("name contains invalid words or violates community standards")
	}
	return nil
}
