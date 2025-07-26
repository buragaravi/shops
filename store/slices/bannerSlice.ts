import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import { Banner } from '../../types';
import { bannerApi } from '../../services/api';

interface BannerState {
  banners: Banner[];
  loading: boolean;
  error: string | null;
}

const initialState: BannerState = {
  banners: [],
  loading: false,
  error: null,
};

// Async thunks
export const fetchActiveBanners = createAsyncThunk(
  'banners/fetchActive',
  async () => {
    return await bannerApi.getActiveBanners();
  }
);

const bannerSlice = createSlice({
  name: 'banners',
  initialState,
  reducers: {
    clearError: (state) => {
      state.error = null;
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(fetchActiveBanners.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchActiveBanners.fulfilled, (state, action) => {
        state.loading = false;
        state.banners = action.payload;
      })
      .addCase(fetchActiveBanners.rejected, (state, action) => {
        state.loading = false;
        state.error = action.error.message || 'Failed to fetch banners';
      });
  },
});

export const { clearError } = bannerSlice.actions;
export default bannerSlice.reducer;
