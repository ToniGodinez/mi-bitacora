import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  DndContext,
  DragOverlay,
  useDraggable,
  useDroppable,
  closestCenter,
} from '@dnd-kit/core';
import RatingModal from '../components/RatingModal';
import './Calendar.css';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000';

// 🎬 Componente de película arrastrable
const DraggableMovie = ({ movie }) => {
  const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({
    id: `movie-${movie.id}`,
    data: { movie }
  });

  const style = transform ? {
    transform: `translate3d(${transform.x}px, ${transform.y}px, 0)`,
    opacity: isDragging ? 0.5 : 1,
  } : undefined;

  return (
    <div
      ref={setNodeRef}
      style={style}
      {...listeners}
      {...attributes}
      className={`movie-card-draggable ${isDragging ? 'dragging' : ''}`}
    >
      <img 
        src={movie.poster_url || 'https://placehold.co/50x75/222/fff?text=Sin+Imagen'} 
        alt={movie.title}
        className="movie-mini-poster"
      />
      <div className="movie-info">
        <div className="movie-title">{movie.title}</div>
        <div className="movie-year">({movie.year})</div>
        <div className="movie-status">{movie.status}</div>
      </div>
    </div>
  );
};

// 🎬 Componente de película programada en el calendario
const ScheduledMovieCard = ({ movie, onRemove, onOpenModal }) => {
  const handleOpenModal = () => {
    console.log(`🎬 === CLICK EN TARJETA PARA MODAL ===`);
    console.log(`🎬 Película completa:`, movie);
    console.log(`🎬 ID de la película: ${movie.id}`);
    console.log(`🎬 Título: "${movie.title}"`);
    onOpenModal(movie);
  };

  const handleRemove = (e) => {
    e.stopPropagation();
    console.log(`🗑️ Eliminando película:`, {
      id: movie.id,
      title: movie.title
    });
    onRemove(movie.id);
  };

  return (
    <div 
      className="scheduled-movie-card"
      onClick={handleOpenModal}
      title={`${movie.title} - Click para calificar`}
    >
      <button 
        className="remove-scheduled-movie"
        onClick={handleRemove}
        title="Eliminar del calendario"
      >
        ✕
      </button>
      
      <div className="scheduled-movie-content">
        <img 
          src={movie.poster_url || 'https://placehold.co/40x60/222/fff?text=Sin+Imagen'} 
          alt={movie.title}
          className="scheduled-movie-poster"
        />
        <div className="scheduled-movie-info">
          <div className="scheduled-movie-title">{movie.title}</div>
        </div>
      </div>
    </div>
  );
};

// 📅 Componente de día del calendario con zona de drop
const DroppableCalendarDay = ({ day, currentDate, scheduledMoviesByDate, onMovieScheduled, onRemoveMovie, onOpenMovieModal }) => {
  const isCurrentMonth = day.getMonth() === currentDate.getMonth();
  const isToday = day.toDateString() === new Date().toDateString();
  const dateString = day.toISOString().split('T')[0];
  const dayMovies = scheduledMoviesByDate[dateString] || [];

  // Debug específico para el día de hoy
  if (dateString === '2025-09-22' || dateString === '2025-09-29') {
    console.log(`🎯 DEBUG día ${dateString}:`, {
      scheduledMoviesByDate,
      dayMovies,
      fechasDisponibles: Object.keys(scheduledMoviesByDate)
    });
  }

  const { isOver, setNodeRef } = useDroppable({
    id: `day-${dateString}`,
    data: { date: dateString }
  });

  // Debug logging
  useEffect(() => {
    if (isOver) {
      console.log(`📅 Hover sobre día ${dateString}`);
    }
  }, [isOver, dateString]);

  return (
    <div 
      ref={setNodeRef}
      className={`calendar-day ${!isCurrentMonth ? 'other-month' : ''} ${isToday ? 'today' : ''} ${isOver ? 'drop-zone' : ''}`}
    >
      <div className="day-number">{day.getDate()}</div>
      <div className="day-content">
        <div className="scheduled-movies">
          {dayMovies.map(movie => (
            <ScheduledMovieCard
              key={movie.id}
              movie={movie}
              onRemove={onRemoveMovie}
              onOpenModal={onOpenMovieModal}
            />
          ))}
          {isOver && (
            <div className="drop-indicator">
              📅 Soltar aquí
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

const Calendar = () => {
  const navigate = useNavigate();
  const [currentDate, setCurrentDate] = useState(new Date());
  const [movies, setMovies] = useState([]);
  const [scheduledMoviesByDate, setScheduledMoviesByDate] = useState({});
  const [loading, setLoading] = useState(true);
  const [activeMovie, setActiveMovie] = useState(null);
  
  // Estados para el modal de calificación
  const [selectedMovieForRating, setSelectedMovieForRating] = useState(null);
  const [isRatingModalOpen, setIsRatingModalOpen] = useState(false);
  
  // Estados para filtros del sidebar
  const [searchTerm, setSearchTerm] = useState('');
  const [genreFilter, setGenreFilter] = useState('');
  const [actorFilter, setActorFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [filteredMovies, setFilteredMovies] = useState([]);
  
  // Estados para opciones de los dropdowns
  const [availableGenres, setAvailableGenres] = useState([]);
  const [availableActors, setAvailableActors] = useState([]);
  const [availableStatuses, setAvailableStatuses] = useState([]);
  
  // Estado para debug expandido/contraído
  const [isDebugExpanded, setIsDebugExpanded] = useState(false);

  // 📅 Cargar películas disponibles y fechas programadas
  useEffect(() => {
    const loadData = async () => {
      try {
        setLoading(true);
        
        // Cargar todas las películas
        const moviesResponse = await fetch(`${API_URL}/api/movies?page=1&limit=1000`);
        if (moviesResponse.ok) {
          const moviesData = await moviesResponse.json();
          const moviesList = Array.isArray(moviesData) ? moviesData : moviesData.rows || [];
          setMovies(moviesList);
          setFilteredMovies(moviesList); // Inicializar movies filtradas
          
          // Extraer opciones únicas para los dropdowns
          extractFilterOptions(moviesList);
        }

        // Cargar películas programadas con detalles completos
        await loadScheduledMovies();

      } catch (error) {
        console.error('❌ Error cargando datos del calendario:', error);
      } finally {
        setLoading(false);
      }
    };

    loadData();
  }, []);

  // 📊 Extraer opciones únicas para los dropdowns
  const extractFilterOptions = (moviesList) => {
    // Extraer géneros únicos
    const genresSet = new Set();
    moviesList.forEach(movie => {
      if (Array.isArray(movie.genres)) {
        movie.genres.forEach(genre => {
          if (genre && genre.trim()) {
            genresSet.add(genre.trim());
          }
        });
      }
    });
    setAvailableGenres([...genresSet].sort());

    // Extraer actores únicos (primeros actores de cada película)
    const actorsSet = new Set();
    moviesList.forEach(movie => {
      if (movie.actors && typeof movie.actors === 'string') {
        // Dividir por comas y tomar los primeros actores
        const actorsList = movie.actors.split(',').slice(0, 3); // Primeros 3 actores
        actorsList.forEach(actor => {
          const cleanActor = actor.trim();
          if (cleanActor) {
            actorsSet.add(cleanActor);
          }
        });
      }
    });
    setAvailableActors([...actorsSet].sort());

    // Extraer estados únicos
    const statusesSet = new Set();
    moviesList.forEach(movie => {
      if (movie.status && movie.status.trim()) {
        statusesSet.add(movie.status.trim());
      }
    });
    setAvailableStatuses([...statusesSet].sort());
  };

  // 🔍 Efecto para filtrar películas
  useEffect(() => {
    filterMovies();
  }, [searchTerm, genreFilter, actorFilter, statusFilter, movies]);

  // 🔍 Función para filtrar películas
  const filterMovies = () => {
    let filtered = [...movies];

    // Filtro por búsqueda de nombre
    if (searchTerm.trim()) {
      filtered = filtered.filter(movie => 
        movie.title?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        movie.name?.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }

    // Filtro por género (búsqueda exacta)
    if (genreFilter) {
      filtered = filtered.filter(movie => {
        const genres = Array.isArray(movie.genres) ? movie.genres : [];
        return genres.some(genre => genre === genreFilter);
      });
    }

    // Filtro por actor (búsqueda exacta)
    if (actorFilter) {
      filtered = filtered.filter(movie => {
        if (!movie.actors) return false;
        const actorsList = movie.actors.split(',').map(actor => actor.trim());
        return actorsList.includes(actorFilter);
      });
    }

    // Filtro por estado (búsqueda exacta)
    if (statusFilter) {
      filtered = filtered.filter(movie => 
        movie.status === statusFilter
      );
    }

    setFilteredMovies(filtered);
  };

  // 🔍 Función para buscar películas
  const handleSearch = () => {
    filterMovies(); // La búsqueda ya se ejecuta automáticamente en useEffect
  };

  // 🔍 Función para limpiar filtros
  const clearFilters = () => {
    setSearchTerm('');
    setGenreFilter('');
    setActorFilter('');
    setStatusFilter('');
  };

  // 📅 Cargar películas programadas con detalles completos
  const loadScheduledMovies = async () => {
    try {
      console.log('🔄 Cargando películas programadas...');
      const response = await fetch(`${API_URL}/api/movies/scheduled-detailed`);
      if (response.ok) {
        const scheduledData = await response.json();
        console.log('📅 Respuesta del servidor:', scheduledData);
        console.log('📅 Fechas encontradas:', Object.keys(scheduledData));
        setScheduledMoviesByDate(scheduledData);
        console.log('📅 Estado actualizado con:', scheduledData);
      } else {
        console.error('❌ Error al cargar películas programadas:', response.status);
      }
    } catch (error) {
      console.error('❌ Error cargando películas programadas:', error);
    }
  };

  // �️ Eliminar película del calendario
  const removeMovieFromCalendar = async (movieId) => {
    try {
      const response = await fetch(`${API_URL}/api/movies/${movieId}/schedule`, {
        method: 'DELETE',
      });

      if (response.ok) {
        console.log(`✅ Película eliminada del calendario`);
        await loadScheduledMovies();
      } else {
        console.error('❌ Error al eliminar película del calendario');
      }
    } catch (error) {
      console.error('❌ Error en removeMovieFromCalendar:', error);
    }
  };

  // 🎬 Abrir modal de calificación
  const openRatingModal = (movie) => {
    console.log(`🎬 === ABRIENDO MODAL ===`);
    console.log(`🎬 Película seleccionada:`, movie);
    setSelectedMovieForRating(movie);
    setIsRatingModalOpen(true);
  };

  // 🎬 Cerrar modal de calificación
  const closeRatingModal = () => {
    setIsRatingModalOpen(false);
    setSelectedMovieForRating(null);
  };

  // 🎬 Callback cuando se actualiza una película
  const handleMovieUpdated = async (updatedMovie) => {
    console.log('✅ Película actualizada, recargando datos del calendario...');
    await loadScheduledMovies();
  };

  // �📅 Programar una película en una fecha específica
  const scheduleMovie = async (movieId, date) => {
    try {
      console.log(`📡 Enviando request para programar película ${movieId} en ${date}`);
      
      const response = await fetch(`${API_URL}/api/movies/${movieId}/schedule`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ scheduled_date: date }),
      });

      console.log(`📡 Response status: ${response.status}`);

      if (response.ok) {
        const result = await response.json();
        console.log(`✅ Película programada exitosamente:`, result);
        
        // Recargar fechas programadas
        await loadScheduledMovies();
        console.log('🔄 Fechas programadas recargadas');
      } else {
        const errorText = await response.text();
        console.error('❌ Error del servidor:', response.status, errorText);
        throw new Error(`Error ${response.status}: ${errorText}`);
      }
    } catch (error) {
      console.error('❌ Error en scheduleMovie:', error);
      // Mostrar error al usuario
      alert(`Error al programar película: ${error.message}`);
      throw error;
    }
  };

  // 🎯 Manejar drag start
  const handleDragStart = (event) => {
    const { active } = event;
    console.log('🎯 Drag Start:', active);
    if (active.data.current?.movie) {
      setActiveMovie(active.data.current.movie);
      console.log('🎬 Película seleccionada:', active.data.current.movie.title);
    }
  };

  // 🎯 Manejar drag end
  const handleDragEnd = async (event) => {
    const { active, over } = event;
    console.log('🎯 Drag End:', { active, over });
    setActiveMovie(null);

    if (!over) {
      console.log('❌ No hay zona de drop válida');
      return;
    }

    const movie = active.data.current?.movie;
    const targetDate = over.data.current?.date;

    console.log('📊 Datos del drop:', { movie: movie?.title, targetDate });

    if (movie && targetDate) {
      console.log(`🎬 Intentando programar "${movie.title}" para ${targetDate}`);
      try {
        await scheduleMovie(movie.id, targetDate);
        console.log('✅ Película programada exitosamente');
      } catch (error) {
        console.error('❌ Error al programar película:', error);
      }
    } else {
      console.log('❌ Datos incompletos para programar película');
    }
  };

  // Generar días del mes
  const generateCalendarDays = () => {
    const year = currentDate.getFullYear();
    const month = currentDate.getMonth();
    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);
    const startDate = new Date(firstDay);
    startDate.setDate(startDate.getDate() - firstDay.getDay());

    const days = [];
    const endDate = new Date(startDate);
    endDate.setDate(endDate.getDate() + 42); // 6 semanas

    for (let d = new Date(startDate); d < endDate; d.setDate(d.getDate() + 1)) {
      days.push(new Date(d));
    }

    return days;
  };

  // Navegación de meses
  const goToPreviousMonth = () => {
    setCurrentDate(prev => new Date(prev.getFullYear(), prev.getMonth() - 1, 1));
  };

  const goToNextMonth = () => {
    setCurrentDate(prev => new Date(prev.getFullYear(), prev.getMonth() + 1, 1));
  };

  const calendarDays = generateCalendarDays();
  const monthNames = [
    'Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
    'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'
  ];

  if (loading) {
    return (
      <div className="calendar-page">
        <div className="calendar-loading">
          🔄 Cargando calendario...
        </div>
      </div>
    );
  }

  return (
    <DndContext
      collisionDetection={closestCenter}
      onDragStart={handleDragStart}
      onDragEnd={handleDragEnd}
      onDragOver={(event) => {
        console.log('🎯 Drag Over:', event.over?.id);
      }}
    >
      <div className="calendar-page">
        <div className="calendar-container">
          {/* Panel izquierdo - Lista de películas */}
          <div className="sidebar-container">
            <div className="sidebar-title">
              🎬 Películas Disponibles
            </div>
            <div className="sidebar-count">
              {movies.length} películas en tu bitácora
            </div>
            <div className="calendar-sidebar">
            
            {/* Sección de búsqueda */}
            <div className="search-section">
              <div className="search-container">
                <input
                  type="text"
                  placeholder="Buscar por nombre..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="search-input"
                />
                <button onClick={handleSearch} className="search-button">
                  🔍
                </button>
              </div>
            </div>

            {/* Sección de filtros */}
            <div className="filters-section">
              <h4 className="filters-title">FILTROS:</h4>
              
              <div className="filter-group">
                <label className="filter-label">GÉNERO:</label>
                <select
                  value={genreFilter}
                  onChange={(e) => setGenreFilter(e.target.value)}
                  className="filter-select"
                >
                  <option value="">Todos los géneros</option>
                  {availableGenres.map(genre => (
                    <option key={genre} value={genre}>
                      {genre}
                    </option>
                  ))}
                </select>
              </div>

              <div className="filter-group">
                <label className="filter-label">ACTOR:</label>
                <select
                  value={actorFilter}
                  onChange={(e) => setActorFilter(e.target.value)}
                  className="filter-select"
                >
                  <option value="">Todos los actores</option>
                  {availableActors.map(actor => (
                    <option key={actor} value={actor}>
                      {actor}
                    </option>
                  ))}
                </select>
              </div>

              <div className="filter-group">
                <label className="filter-label">ESTADO:</label>
                <select
                  value={statusFilter}
                  onChange={(e) => setStatusFilter(e.target.value)}
                  className="filter-select"
                >
                  <option value="">Todos los estados</option>
                  {availableStatuses.map(status => (
                    <option key={status} value={status}>
                      {status}
                    </option>
                  ))}
                </select>
              </div>

              <div className="filter-actions">
                <button onClick={clearFilters} className="clear-filters-btn">
                  Limpiar filtros
                </button>
                <span className="results-count">
                  {filteredMovies.length} resultado(s)
                </span>
              </div>
            </div>

            {/* Separador con instrucción */}
            <div className="drag-instruction">
              <div className="separator-line"></div>
              <p className="instruction-text">🖱️ Arrastra tu película al calendario</p>
              <div className="separator-line"></div>
            </div>
            
            {/* Contenedor con scroll para las películas */}
            <div className="movies-container">
              <div className="movies-list">
                {filteredMovies.slice(0, 20).map(movie => (
                  <DraggableMovie key={movie.id} movie={movie} />
                ))}
                {filteredMovies.length > 20 && (
                  <div className="movies-overflow">
                    + {filteredMovies.length - 20} películas más...
                  </div>
                )}
                
                {filteredMovies.length === 0 && !loading && (
                  <div className="no-results">
                    📭 No se encontraron películas con los filtros aplicados
                  </div>
                )}
              </div>
            </div>
          </div>
          </div>

          {/* DEBUG: Fuera del sidebar */}
          {Object.keys(scheduledMoviesByDate).length > 0 && (
            <div className="debug-info">
              <div className="debug-header" onClick={() => setIsDebugExpanded(!isDebugExpanded)}>
                <span>🐛 DEBUG</span>
                <span className="debug-toggle">{isDebugExpanded ? '−' : '+'}</span>
              </div>
              {isDebugExpanded && (
                <div className="debug-content">
                  <strong>Películas programadas:</strong>
                  {Object.entries(scheduledMoviesByDate).map(([date, movies]) => (
                    <div key={date}>
                      📅 {date}: {movies.length} película(s)
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Panel derecho - Calendario */}
          <div className="calendar-main">
            <div className="calendar-header">
              <button className="calendar-nav-btn" onClick={goToPreviousMonth}>
                ‹ Anterior
              </button>
              <h2 className="calendar-title">
                🗓️ {monthNames[currentDate.getMonth()]} {currentDate.getFullYear()}
              </h2>
              <button className="calendar-nav-btn" onClick={goToNextMonth}>
                Siguiente ›
              </button>
            </div>

            <div className="calendar-grid">
              {/* Días de la semana */}
              {['Dom', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb'].map(day => (
                <div key={day} className="calendar-day-header">
                  {day}
                </div>
              ))}

              {/* Días del mes */}
              {calendarDays.map((day, index) => (
                <DroppableCalendarDay
                  key={index}
                  day={day}
                  currentDate={currentDate}
                  scheduledMoviesByDate={scheduledMoviesByDate}
                  onMovieScheduled={scheduleMovie}
                  onRemoveMovie={removeMovieFromCalendar}
                  onOpenMovieModal={openRatingModal}
                />
              ))}
            </div>
          </div>
        </div>

        {/* Overlay de drag */}
        <DragOverlay>
          {activeMovie ? (
            <div className="movie-card-draggable dragging">
              <img 
                src={activeMovie.poster_url || 'https://placehold.co/50x75/222/fff?text=Sin+Imagen'} 
                alt={activeMovie.title}
                className="movie-mini-poster"
              />
              <div className="movie-info">
                <div className="movie-title">{activeMovie.title}</div>
                <div className="movie-year">({activeMovie.year})</div>
                <div className="movie-status">{activeMovie.status}</div>
              </div>
            </div>
          ) : null}
        </DragOverlay>
      </div>
      
      {/* Modal de calificación */}
      <RatingModal
        movie={selectedMovieForRating}
        isOpen={isRatingModalOpen}
        onClose={closeRatingModal}
        onMovieUpdated={handleMovieUpdated}
      />
    </DndContext>
  );
};

export default Calendar;
