import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import { ComboPack } from '../../types';
import { comboPackApi } from '../../services/api';

interface ComboPackState {
  comboPacks: ComboPack[];
  featuredComboPacks: ComboPack[];
  currentComboPack: ComboPack | null;
  loading: boolean;
  error: string | null;
}

const initialState: ComboPackState = {
  comboPacks: [],
  featuredComboPacks: [],
  currentComboPack: null,
  loading: false,
  error: null,
};

// Async thunks
export const fetchAllComboPacks = createAsyncThunk(
  'comboPacks/fetchAll',
  async () => {
    return await comboPackApi.getAllComboPacks();
  }
);

export const fetchFeaturedComboPacks = createAsyncThunk(
  'comboPacks/fetchFeatured',
  async () => {
    return await comboPackApi.getFeaturedComboPacks();
  }
);

export const fetchComboPackById = createAsyncThunk(
  'comboPacks/fetchById',
  async (id: string) => {
    return await comboPackApi.getComboPackById(id);
  }
);

const comboPackSlice = createSlice({
  name: 'comboPacks',
  initialState,
  reducers: {
    clearError: (state) => {
      state.error = null;
    },
  },
  extraReducers: (builder) => {
    builder
      // Fetch all combo packs
      .addCase(fetchAllComboPacks.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchAllComboPacks.fulfilled, (state, action) => {
        state.loading = false;
        state.comboPacks = action.payload;
      })
      .addCase(fetchAllComboPacks.rejected, (state, action) => {
        state.loading = false;
        state.error = action.error.message || 'Failed to fetch combo packs';
      })
      
      // Fetch featured combo packs
      .addCase(fetchFeaturedComboPacks.pending, (state) => {
        state.loading = true;
      })
      .addCase(fetchFeaturedComboPacks.fulfilled, (state, action) => {
        state.loading = false;
        state.featuredComboPacks = action.payload;
      })
      .addCase(fetchFeaturedComboPacks.rejected, (state, action) => {
        state.loading = false;
        state.error = action.error.message || 'Failed to fetch featured combo packs';
      })
      
      // Fetch combo pack by ID
      .addCase(fetchComboPackById.pending, (state) => {
        state.loading = true;
      })
      .addCase(fetchComboPackById.fulfilled, (state, action) => {
        state.loading = false;
        state.currentComboPack = action.payload;
      })
      .addCase(fetchComboPackById.rejected, (state, action) => {
        state.loading = false;
        state.error = action.error.message || 'Failed to fetch combo pack';
      });
  },
});

export const { clearError } = comboPackSlice.actions;
export default comboPackSlice.reducer;
