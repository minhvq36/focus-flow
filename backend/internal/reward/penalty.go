package reward

import "fmt"

// SelectPenaltyItem random chọn 1 item từ danh sách eligible.
// Trả nil nếu list rỗng — caller không cần xử lý lỗi đặc biệt.
func SelectPenaltyItem(items []PenaltyResult) (*PenaltyResult, error) {
	if len(items) == 0 {
		return nil, nil
	}

	idx, err := cryptoRandN(len(items))
	if err != nil {
		return nil, fmt.Errorf("penalty: random pick failed: %w", err)
	}

	chosen := items[idx]
	return &chosen, nil
}
